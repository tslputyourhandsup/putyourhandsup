// teach.js - 終極完整版 (新增哺集乳室、動態擠壓雷達與所有防呆機制 + 自動連播與不中斷優化)

document.addEventListener('DOMContentLoaded', async () => {

   // 🎯 新增：防止切換過程中重複觸發或被打斷的鎖定開關
   let isTransitioningIcon = false;

   const SIGN_STEPS = {
        '樓梯': 1, '電扶梯': 1, '電梯': 1, '公共電話': 1, '公車站': 1, '廁所': 1, '無線網路': 1, '學校': 1,
        '一般垃圾': 2, '女廁': 2, '男廁': 2, '公園': 2, '月台': 2, '加油站': 2, '哺(集)乳室': 2, 
        '茶水間': 2, '高鐵': 2, '捷運': 2, '滅火器': 2, '禁止交談': 2, '禁止進入': 2, 
        '禁止吸菸': 2, '禁止拍攝': 2, '禁止觸摸': 2, '資源回收': 2, '機場': 2, '餐廳': 2, '體育館': 2,
        '海關': 3, '圖書館': 3, '禁止飲食': 3, '置物櫃': 3 
    };

    let currentStep = 1;
    let handXHistory = [];
    let handYHistory = [];
    let handGatherHistory = []; // 🎯 新增：專屬哺集乳室的聚攏指數軌跡
    let lastWaveTime = 0;
    let lastWaveYTime = 0;
    let isWavedLock = false;

    let platformYHistory = [];
    let platformSizeHistory = [];

    const stepDotsContainer = document.getElementById('teach-step-dots');
    const teachTitle = document.getElementById('teach-title');
    const userWebcam = document.getElementById('user-webcam');
    const accuracyBar = document.getElementById('accuracy-bar');
    const accuracyText = document.getElementById('accuracy-text');
    const teachInstruction = document.getElementById('teach-instruction');
    const webcamDimOverlay = document.getElementById('webcam-dim-overlay');
    const videoBoth = document.getElementById('video-both');
    const videoIcon = document.getElementById('video-icon');
    const videoHand = document.getElementById('video-hand');

    // 🎯 讀取 URL 參數，決定初始圖標
    const urlParams = new URLSearchParams(window.location.search);
    const initialIcon = urlParams.get('icon') || "樓梯"; // 沒抓到就預設樓梯

    if (teachTitle) teachTitle.innerText = initialIcon; 
    const initialDescImg = document.querySelector('.teach-desc-img');
    if (initialDescImg) initialDescImg.src = `teach/${initialIcon}_圖標說明.png`;

  function updateToStep(step, iconName) {
        currentStep = step;
        isWavedLock = false;
        
        // 🎯 關鍵修復 1：集中清空所有軌跡陣列，徹底消除上一個動作的殘留記憶
        handXHistory = []; 
        handYHistory = []; 
        platformSizeHistory = [];
        platformYHistory = [];
        handGatherHistory = [];

        // 🎯 關鍵修復 2：加入「步驟防誤觸冷卻時間」 (1.5秒)
        // 讓使用者有時間放下手或準備下一個動作
        window.isStepCooldown = true;
        setTimeout(() => { window.isStepCooldown = false; }, 1500); 

        if (stepDotsContainer) {
            const totalSteps = SIGN_STEPS[iconName] || 1;
            stepDotsContainer.innerHTML = '';
            for (let i = 1; i <= totalSteps; i++) {
                const dot = document.createElement('span');
                dot.className = 'dot' + (i === currentStep ? ' active' : '');
                stepDotsContainer.appendChild(dot);
            }
        }
        if (videoBoth) videoBoth.src = `teach/${iconName}_步驟${step}.webm`;
        if (videoIcon) videoIcon.src = `teach/${iconName}_步驟${step}_圖標.webm`;
        if (videoHand) videoHand.src = `teach/${iconName}_步驟${step}_手勢.webm`;
        syncVideos();
    }
    if (teachTitle) updateToStep(1, teachTitle.innerText.trim());

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: "user" }
        });
        if (userWebcam) {
            userWebcam.srcObject = stream;
            userWebcam.onloadeddata = () => { userWebcam.play(); initHandsAI(); };
        }
    } catch (error) { console.error("無法開啟鏡頭：", error); }

    function initHandsAI() {
        if (typeof Hands === 'undefined') return;
        const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
        hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
        hands.onResults(onHandsResults);
        async function detect() { if (userWebcam?.readyState >= 2) await hands.send({image: userWebcam}); requestAnimationFrame(detect); }
        detect();
    }

    function analyzeHandPose(landmarks) {
        const wrist = landmarks[0];
        const centerY = landmarks[9].y; 
        const centerX = landmarks[9].x;
        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
        
        const size = getDist(wrist, landmarks[9]); 

        const isThumbExt = getDist(wrist, landmarks[4]) > getDist(wrist, landmarks[2]) * 1.1;
        const isIndexExt = getDist(wrist, landmarks[8]) > getDist(wrist, landmarks[5]) * 1.1;
        const isMiddleExt = getDist(wrist, landmarks[12]) > getDist(wrist, landmarks[9]) * 1.1;
        const isRingExt = getDist(wrist, landmarks[16]) > getDist(wrist, landmarks[13]) * 1.1;
        const isPinkyExt = getDist(wrist, landmarks[20]) > getDist(wrist, landmarks[17]) * 1.1;

        const isIndexFolded = getDist(wrist, landmarks[8]) < getDist(wrist, landmarks[5]) * 1.3;
        const isMiddleFolded = getDist(wrist, landmarks[12]) < getDist(wrist, landmarks[9]) * 1.3;
        const isRingFolded = getDist(wrist, landmarks[16]) < getDist(wrist, landmarks[13]) * 1.3;
        const isPinkyFolded = getDist(wrist, landmarks[20]) < getDist(wrist, landmarks[17]) * 1.3;

        const isIndexPointingDown = landmarks[8].y > landmarks[5].y;
        const isMiddlePointingDown = landmarks[12].y > landmarks[9].y;
        
        const isLegs = isIndexExt && isMiddleExt && isIndexPointingDown && isMiddlePointingDown; 
        const dx = landmarks[12].x - wrist.x;
        const dy = landmarks[12].y - wrist.y;
        const angle = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI);
        const isPlatform = isIndexExt && isMiddleExt && (angle < 60 || angle > 120); 
        const isHorizontal = angle < 60 || angle > 120; // 放寬的水平判定 (給哺集乳室用)

        const isPhoneShape = isThumbExt && isPinkyExt && isIndexFolded && isMiddleFolded && isRingFolded;

        const thumbIndexDist = getDist(landmarks[4], landmarks[8]);
        const isWCShape = isMiddleExt && isRingExt && isPinkyExt && (thumbIndexDist > getDist(landmarks[5], landmarks[8]) * 0.5);

        const isThumbForward = landmarks[4].y < landmarks[5].y && landmarks[4].y < landmarks[9].y;
        const isThumbUp = (isThumbExt || isThumbForward) && isIndexFolded && isMiddleFolded && isRingFolded && isPinkyFolded;
        const isPinkyUp = isPinkyExt && isIndexFolded && isMiddleFolded && isRingFolded;

        const isThreeShape = isIndexExt && isMiddleExt && isRingExt && isPinkyFolded;
        const isOneShape = isIndexExt && isMiddleFolded && isRingFolded && isPinkyFolded;

        const isFireShape = landmarks[12].y < landmarks[0].y + 0.1;
        const isFist = isMiddleFolded && isRingFolded && isPinkyFolded;
        const isHoseShape = !isIndexFolded && isMiddleFolded && isRingFolded && isPinkyFolded;

        const isHookShape = isMiddleFolded && isRingFolded && isPinkyFolded && (getDist(wrist, landmarks[8]) > getDist(wrist, landmarks[12]) * 1.3);
        const isLooseFist = isMiddleFolded && isRingFolded;
        const isOpenHand = isIndexExt && isMiddleExt && isRingExt && isPinkyExt;
        const isFlatHand = isIndexExt && isMiddleExt && isRingExt && isPinkyExt;

        const thumbRatio = getDist(wrist, landmarks[4]) / getDist(wrist, landmarks[2]);
        const indexRatio = getDist(wrist, landmarks[8]) / getDist(wrist, landmarks[5]);
        const middleRatio = getDist(wrist, landmarks[12]) / getDist(wrist, landmarks[9]);
        const ringRatio = getDist(wrist, landmarks[16]) / getDist(wrist, landmarks[13]);
        const pinkyRatio = getDist(wrist, landmarks[20]) / getDist(wrist, landmarks[17]);

        const isCupMiddle = middleRatio > 1.2 && middleRatio < 2.8;
        const isCupRing = ringRatio > 1.2 && ringRatio < 3.0;
        const isCupPinky = pinkyRatio > 1.2 && pinkyRatio < 2.8;
        const isCupShape = isCupMiddle && isCupRing && isCupPinky;

        const isFrameShape = isMiddleFolded && isRingFolded && isPinkyFolded && (thumbIndexDist > getDist(wrist, landmarks[9]) * 0.6);

        const isLockerFist = (indexRatio < 1.8) && (middleRatio < 1.8) && (ringRatio < 1.8) && (pinkyRatio < 1.8);
        const isSevenShape = (thumbRatio > 1.05) && (indexRatio > 0.9) && (middleRatio < 1.8) && (ringRatio < 1.8) && (pinkyRatio < 1.8);

        // 🍼 哺集乳室專用：聚攏指數 (指尖到大拇指尖的總和比例)
        const gatherDist = getDist(landmarks[8], landmarks[4]) + getDist(landmarks[12], landmarks[4]) + 
                           getDist(landmarks[16], landmarks[4]) + getDist(landmarks[20], landmarks[4]);
        const gatherRatio = gatherDist / size; 

        // 📚 新增：圖書館 Step 1 - 攤平 (四指伸直)
        const isFlatOpen = isIndexExt && isMiddleExt && isRingExt && isPinkyExt;

        // 📚 新增：圖書館 Step 2 - 一手比二，大拇指貼到中指
        // 食指、中指伸直，無名指、小指收起，且大拇指尖(4)靠近中指第二關節(10)
        const isLibTwoShape = isIndexExt && isMiddleExt && isRingFolded && isPinkyFolded && (getDist(landmarks[4], landmarks[10]) < getDist(wrist, landmarks[9]) * 0.6);

        // 📚 新增：圖書館 Step 3 - 手指微彎 (不是全直，也不是握拳)
        const isSlightlyBent = !isIndexExt && !isMiddleExt && !isFist;

        // 🚨 統一回傳所有變數，記得把新加的 isFlatOpen, isLibTwoShape, isSlightlyBent 加上去
        return { isLegs, isPlatform, isPhoneShape, isWCShape, isThumbUp, isPinkyUp, isThreeShape, isOneShape, isFireShape, isFist, isHoseShape, isHookShape, isFlatOpen, isLibTwoShape, isSlightlyBent, centerY, centerX, size, landmarks };
    }

  function onHandsResults(results) {
        // 🎯 新增：如果正在自動切換圖標中，就凍結畫面維持 100% 的狀態，不再做額外判定
        if (isTransitioningIcon) return;

        // 🎯 關鍵修復 3：攔截防誤觸冷卻狀態
        // 如果正在「動作切換的冷卻時間」內，直接顯示準備提示，不進行手勢判定
        if (window.isStepCooldown) {
            const accuracyBar = document.getElementById('accuracy-bar');
            const accuracyText = document.getElementById('accuracy-text');
            const teachInstruction = document.getElementById('teach-instruction');
            
            if (accuracyBar) accuracyBar.style.width = '0%';
            if (accuracyText) accuracyText.innerText = '0%';
            if (teachInstruction) {
                teachInstruction.innerText = "動作切換中，請準備...";
                teachInstruction.style.color = "#4A4A4A";
            }
            return; // 🛑 提早結束，直接跳過下方所有的手勢判斷邏輯
        }

        const name = teachTitle ? teachTitle.innerText.trim() : "";
        let score = 0; let hintMsg = "等待開始...";
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            if (webcamDimOverlay) webcamDimOverlay.classList.add('hidden');

            const hand = analyzeHandPose(results.multiHandLandmarks[0]);
// ==========================================
            // 🍼 哺(集)乳室 (雙步：鉤子靠嘴 -> 抱嬰擠乳)
            // ==========================================
             if (name === "哺(集)乳室") {
                // ================= 第一步：鉤子靠嘴 =================
                if (currentStep === 1) {
                    if (results.multiHandLandmarks.length >= 1) {
                        const hand = analyzeHandPose(results.multiHandLandmarks[0]);
                        if (hand.isHookShape && hand.centerY < 0.6) {
                            handYHistory.push(hand.centerY);
                            if (handYHistory.length > 15) handYHistory.shift();
                            
                            if (handYHistory.length > 10) {
                                isWavedLock = true;
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "第一步正確！即將切換影片...";
                                if (!window.stepTimer) {
                                    window.stepTimer = setTimeout(() => {
                                        updateToStep(2, name); 
                                        handYHistory = []; handXHistory = [];
                                        window.stepTimer = null;
                                    }, 1000); 
                                }
                            } else {
                                score = 80; hintMsg = "姿勢正確！請保持在嘴巴下方...";
                            }
                        } else {
                            isWavedLock = false; handYHistory = [];
                            score = 40; hintMsg = "第一步：請比出食指微彎，放在嘴巴下方";
                        }
                    } else {
                        score = 20; hintMsg = "請將手放在畫面中比出食指微彎手勢";
                    }
                } 
                // ================= 第二步：抱嬰擠乳 (預備鎖定 + 擠壓偵測) =================
                else if (currentStep === 2) {
                    // 初始化鎖定狀態
                    if (typeof window.nurseReady === 'undefined') window.nurseReady = false;

                    if (results.multiHandLandmarks.length === 2) {
                        const hA = analyzeHandPose(results.multiHandLandmarks[0]);
                        const hB = analyzeHandPose(results.multiHandLandmarks[1]);
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        let topHand = hA.centerY < hB.centerY ? hA : hB;
                        let botHand = hA.centerY < hB.centerY ? hB : hA;

                        const calcRatios = (hand) => {
                            const wrist = hand.landmarks[0];
                            return {
                                idx: getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]),
                                mid: getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]),
                                rng: getDist(wrist, hand.landmarks[16]) / getDist(wrist, hand.landmarks[13]),
                                pnk: getDist(wrist, hand.landmarks[20]) / getDist(wrist, hand.landmarks[17])
                            };
                        };

                        const rTop = calcRatios(topHand);
                        const rBot = calcRatios(botHand);

                        // 🎯 根據你的數據：預備時雙手手指都有明顯伸出 (數值大都在 1.7 ~ 2.6 之間)
                        // 設定 > 1.4 即可穩定鎖定預備姿勢
                        const isCradleShape = (r) => (r.idx > 1.4 && r.mid > 1.4 && r.rng > 1.4);

                        // --- 階段一：要求雙手就位並停頓 ---
                        if (!window.nurseReady) {
                            if (isCradleShape(rTop) && isCradleShape(rBot)) {
                                handYHistory.push(topHand.centerY);
                                if (handYHistory.length > 15) handYHistory.shift();
                                
                                if (handYHistory.length > 10) {
                                    const moveY = Math.max(...handYHistory) - Math.min(...handYHistory);
                                    
                                    // 停頓一下 (上下位移 < 0.03) 即可鎖定！
                                    if (moveY < 0.03) {
                                        window.nurseReady = true;
                                        handXHistory = []; // 用來追蹤手指的開合度
                                        score = 80; hintMsg = "已鎖定！請將上方手「重複擠壓 (手掌開合)」";
                                    } else {
                                        score = 60; hintMsg = "請比出抱嬰與擠乳的動作";
                                    }
                                } else {
                                    score = 60; hintMsg = "請比出抱嬰與擠乳的動作";
                                }
                            } else {
                                score = 40; hintMsg = "第二步：一手在下平放(抱嬰)，一手在上微張(準備擠乳)";
                                handYHistory = [];
                            }
                        } 
                        // --- 階段二：已鎖定，專心抓擠壓動作，無視形狀變形 ---
                        else {
                            // 計算上方手的手指伸展總和 (張開時總和大約 8.0~10.0，擠壓時會急遽掉落)
                            const openScore = rTop.idx + rTop.mid + rTop.rng + rTop.pnk;
                            
                            handXHistory.push(openScore);
                            handYHistory.push(topHand.centerY);
                            
                            if (handXHistory.length > 20) handXHistory.shift();
                            if (handYHistory.length > 20) handYHistory.shift();
                            
                            if (handXHistory.length > 5) {
                                const maxOpen = Math.max(...handXHistory);
                                const squeezeAmount = maxOpen - openScore;
                                const moveDown = topHand.centerY - Math.min(...handYHistory);
                                
                                // 🎯 擠壓判定：只要手指有往內抓 (比例總和掉落 > 1.5)，或是手往下擠壓 (>0.03)
                                if (squeezeAmount > 1.5 || moveDown > 0.03) {
                                    isWavedLock = true;
                                }
                            }
                            
                            if (isWavedLock) {
                                score = 100; hintMsg = "太完美了！這就是哺(集)乳室的手語！";
                            } else {
                                score = 80; hintMsg = "已鎖定！請將上方手「重複擠壓 (往內抓合)」";
                            }
                        }
                    } else {
                        // 防呆機制：如果手跑出畫面，解除鎖定重來
                        if (!isWavedLock) {
                            window.nurseReady = false; 
                            handYHistory = []; handXHistory = [];
                            score = 20; hintMsg = "第二步需要「雙手」都在畫面中配合喔！";
                        }
                    }
                }
            }

            // ==========================================
            // 🧯 滅火器 (雙步終極修正版：到位才追蹤 + 無視遮蔽)
            // ==========================================
            else if (name === "滅火器") {
                if (currentStep === 1) {
                    if (results.multiHandLandmarks.length === 2) {
                        const hA = analyzeHandPose(results.multiHandLandmarks[0]);
                        const hB = analyzeHandPose(results.multiHandLandmarks[1]);

                        const isAUpright = hA.landmarks[0].y > hA.landmarks[9].y - 0.1;
                        const isBUpright = hB.landmarks[0].y > hB.landmarks[9].y - 0.1;
                        const isAFire = hA.landmarks[12].y < hA.landmarks[0].y + 0.1;
                        const isBFire = hB.landmarks[12].y < hB.landmarks[0].y + 0.1;

                        if (isAFire && isBFire && isAUpright && isBUpright) {

                            handYHistory.push(hA.landmarks[9].y);
                            if (handYHistory.length > 20) handYHistory.shift();

                            if (handYHistory.length > 5 && (Math.max(...handYHistory) - Math.min(...handYHistory)) > 0.05) {
                                isWavedLock = true;
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "第一步「火」正確！即將切換影片...";
                                if (!window.stepTimer) {
                                    window.stepTimer = setTimeout(() => {
                                        updateToStep(2, name);
                                        handYHistory = []; handXHistory = []; window.stepTimer = null;
                                    }, 1000);
                                }
                            } else {
                                score = 80; hintMsg = "形狀正確！現在請將雙手「上下擺動」模擬火焰";
                                clearTimeout(window.stepTimer); window.stepTimer = null;
                            }
                        } else {
                            isWavedLock = false; handYHistory = [];
                            score = 40; hintMsg = "第一步：雙手十指微彎、手心朝上模擬火焰";
                            clearTimeout(window.stepTimer); window.stepTimer = null;
                        }
                    } else {
                        isWavedLock = false; handYHistory = [];
                        score = 20; hintMsg = "第一步需要雙手一起比出「火」喔！";
                        clearTimeout(window.stepTimer); window.stepTimer = null;
                    }
                }
                else if (currentStep === 2) {
                    if (results.multiHandLandmarks.length === 2) {
                        const hA = analyzeHandPose(results.multiHandLandmarks[0]);
                        const hB = analyzeHandPose(results.multiHandLandmarks[1]);

                        let topHand = hA.centerY < hB.centerY ? hA : hB;
                        let bottomHand = hA.centerY < hB.centerY ? hB : hA;

                        const getD = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        const isTopClosed = getD(topHand.landmarks[0], topHand.landmarks[12]) < getD(topHand.landmarks[0], topHand.landmarks[9]) * 1.8;
                        const isBottomClosed = getD(bottomHand.landmarks[0], bottomHand.landmarks[12]) < getD(bottomHand.landmarks[0], bottomHand.landmarks[9]) * 1.8;

                        if (isTopClosed && isBottomClosed) {
                            const isClose = Math.hypot(topHand.centerX - bottomHand.centerX, topHand.centerY - bottomHand.centerY) < 0.4;

                            if (isClose) {
                                handXHistory.push(topHand.landmarks[0].x);
                                if (handXHistory.length > 20) handXHistory.shift();
                                if (handXHistory.length > 5 && (Math.max(...handXHistory) - Math.min(...handXHistory)) > 0.04) {
                                    isWavedLock = true;
                                }

                                if (isWavedLock) {
                                    score = 100; hintMsg = "太完美了！這就是滅火器的手語！";
                                } else {
                                    score = 80; hintMsg = "位置正確！請將雙手疊在一起「左右擺動」";
                                }
                            } else {
                                isWavedLock = false; handXHistory = [];
                                score = 60; hintMsg = "快對了！請把指向鏡頭的手疊在「拳頭」上方";
                            }
                        } else {
                            isWavedLock = false; handXHistory = [];
                            score = 40; hintMsg = "第二步：一手比「拳頭」，另一手食指指向鏡頭疊在上面";
                        }
                    } else {
                        isWavedLock = false; handXHistory = [];
                        score = 20; hintMsg = "第二步需要雙手一起操作喔！";
                    }
                }
            }
          // ==========================================
            // 🗑️ 一般垃圾 (雙步：擦鼻子 -> 往外丟)
            // ==========================================
            else if (name === "一般垃圾") {
                const hand = analyzeHandPose(results.multiHandLandmarks[0]);

                if (currentStep === 1) {
                    if (isWavedLock) {
                        score = 100; hintMsg = "第一步正確！即將切換影片...";
                        if (!window.stepTimer) {
                            window.stepTimer = setTimeout(() => {
                                updateToStep(2, name); 
                                handYHistory = []; handXHistory = [];
                                window.stepTimer = null;
                            }, 1000); 
                        }
                    } 
                    else if (hand.isHookShape && hand.centerY < 0.6) {
                        // 記錄食指尖的位置
                        handXHistory.push(hand.landmarks[8].x);
                        handYHistory.push(hand.landmarks[8].y); 
                        if (handXHistory.length > 15) handXHistory.shift();
                        if (handYHistory.length > 15) handYHistory.shift();

                        const moveX = Math.max(...handXHistory) - Math.min(...handXHistory);
                        const moveY = Math.max(...handYHistory) - Math.min(...handYHistory);

                        // 🎯 關鍵修改 1：將 moveX 門檻從 0.03 提高到 0.06，必須要有「明確的撥動」才會觸發
                        if (handXHistory.length > 5 && moveX > 0.06 && moveX > moveY * 0.5) {
                            isWavedLock = true;
                        } else {
                            score = 80; hintMsg = "姿勢正確！請在鼻子旁「向外撥動」食指";
                        }
                    } else {
                        score = 40; hintMsg = "第一步：請比出食指微彎，並放在鼻子旁";
                        handXHistory = []; handYHistory = [];
                    }
                } 
                else if (currentStep === 2) {
                    const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                    const wrist = hand.landmarks[0];
                    const idx = getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]);
                    const mid = getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]);
                    
                    // 只要食指、中指沒有明顯伸長，就當作是在握拳準備
                    const isFistState = (idx < 1.2 && mid < 1.2) || hand.isFist || hand.isLooseFist || hand.isLockerFist;
                    // 食指、中指有伸直就算張開
                    const isOpenState = (idx > 1.3 && mid > 1.3);

                    if (isWavedLock) {
                        score = 100; hintMsg = "太完美了！這就是一般垃圾的手語！";
                    } 
                    else if (isOpenState || hand.isOpenHand) {
                        // 🎯 關鍵修改 2：只要手掌張開，直接鎖定過關 100%！(不用再計算往前推了)
                        isWavedLock = true;
                    }
                    else if (isFistState) {
                        score = 80; hintMsg = "準備完成！請往前丟並「張開手掌」";
                    }
                    else {
                        // 在半開半合的過渡瞬間，維持 80 分
                        score = 80; hintMsg = "請往前丟並「張開手掌」";
                    }
                }
            }
          // ==========================================
            // 🍵 茶水間 (雙步：按飲水機 -> 喝水)
            // ==========================================
         else if (name === "茶水間") {
                if (currentStep === 1) {
                    if (results.multiHandLandmarks.length === 2) {
                        const hA = analyzeHandPose(results.multiHandLandmarks[0]);
                        const hB = analyzeHandPose(results.multiHandLandmarks[1]);
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        const calcRatios = (hand) => {
                            const wrist = hand.landmarks[0];
                            return {
                                thumb: getDist(wrist, hand.landmarks[4]) / getDist(wrist, hand.landmarks[2]),
                                idx: getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]),
                                mid: getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]),
                                rng: getDist(wrist, hand.landmarks[16]) / getDist(wrist, hand.landmarks[13]),
                                pnk: getDist(wrist, hand.landmarks[20]) / getDist(wrist, hand.landmarks[17])
                            };
                        };

                        const rA = calcRatios(hA);
                        const rB = calcRatios(hB);

                        const isThumbPress = (r) => (r.thumb > 1.4 && r.idx < 1.0 && r.mid < 1.0 && r.rng < 1.0 && r.pnk < 1.0);
                        const isCup = (r) => (r.idx > 1.2 && r.mid > 1.2 && r.rng > 1.2 && r.pnk > 1.2);

                        let thumbH = null;
                        let cupH = null;

                        if (isThumbPress(rA) && isCup(rB)) { thumbH = hA; cupH = hB; }
                        else if (isThumbPress(rB) && isCup(rA)) { thumbH = hB; cupH = hA; }

                        if (thumbH && cupH) {
                            const isAbove = thumbH.centerY < cupH.centerY;
                            const isCloseX = Math.abs(thumbH.centerX - cupH.centerX) < 0.3;

                            if (isAbove && isCloseX) {
                                // 🎯 關鍵修改：不再追蹤「絕對座標」，改追蹤「大拇指尖到下方杯子的距離」
                                const pressDist = getDist(thumbH.landmarks[4], cupH.landmarks[9]);
                                
                                handXHistory.push(pressDist);
                                platformSizeHistory.push(thumbH.size); // 同時記錄大小，用來判斷往前推
                                
                                if (handXHistory.length > 20) handXHistory.shift();
                                if (platformSizeHistory.length > 20) platformSizeHistory.shift();
                                
                                if (handXHistory.length > 5) {
                                    const maxDist = Math.max(...handXHistory);
                                    const minSize = Math.min(...platformSizeHistory);
                                    
                                    // 判斷 1：往下按 (大拇指到杯子的距離縮短了 0.04 以上)
                                    // 判斷 2：往前推 (大拇指手部尺寸變大了 0.015 以上)
                                    if (maxDist - pressDist > 0.04 || thumbH.size - minSize > 0.015) {
                                        isWavedLock = true;
                                    }
                                }

                                if (isWavedLock) { 
                                    score = 100; hintMsg = "第一步正確！即將切換影片..."; 
                                    if (!window.stepTimer) {
                                        window.stepTimer = setTimeout(() => {
                                            updateToStep(2, name); 
                                            handXHistory = []; platformSizeHistory = [];
                                            window.stepTimer = null;
                                        }, 1000); 
                                    }
                                } else { 
                                    score = 80; hintMsg = "準備完成！請將大拇指「往下按」或「往前推」"; 
                                }
                            } else {
                                if (!isAbove) {
                                    score = 60; hintMsg = "請把「比讚的手」放在「杯子手」的上方";
                                } else {
                                    score = 60; hintMsg = "雙手請稍微靠近一點喔！";
                                }
                                isWavedLock = false; handXHistory = []; platformSizeHistory = [];
                            }
                        } else {
                            isWavedLock = false; handXHistory = []; platformSizeHistory = [];
                            score = 40; hintMsg = "第一步：一手在下比「杯子」，另一手在上比「平放的讚」";
                        }
                    } else {
                        isWavedLock = false; handXHistory = []; platformSizeHistory = [];
                        score = 20; hintMsg = "第一步需要雙手一起操作喔！";
                    }
                }
                else if (currentStep === 2) {
                    let foundCupH = null;
                    if (results.multiHandLandmarks.length >= 1) {
                        // 尋找畫面中符合你「杯子」特徵的手
                        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                            let h = analyzeHandPose(results.multiHandLandmarks[i]);
                            const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                            const wrist = h.landmarks[0];
                            const idx = getDist(wrist, h.landmarks[8]) / getDist(wrist, h.landmarks[5]);
                            const mid = getDist(wrist, h.landmarks[12]) / getDist(wrist, h.landmarks[9]);
                            const rng = getDist(wrist, h.landmarks[16]) / getDist(wrist, h.landmarks[13]);
                            const pnk = getDist(wrist, h.landmarks[20]) / getDist(wrist, h.landmarks[17]);
                            
                            if (idx > 1.2 && mid > 1.2 && rng > 1.2 && pnk > 1.2) {
                                foundCupH = h; break;
                            }
                        }
                        
                        if (foundCupH) {
                            handYHistory.push(foundCupH.centerY);
                            if (handYHistory.length > 20) handYHistory.shift();
                            
                            if (handYHistory.length > 5) {
                                const movedUp = Math.max(...handYHistory) - foundCupH.centerY; 
                                
                                // 往上喝水：位移大於0.04且高度在嘴巴附近(<0.6)，或者直接把手舉很高(<0.45)
                                if ((movedUp > 0.04 && foundCupH.centerY < 0.6) || foundCupH.centerY < 0.45) {
                                    isWavedLock = true;
                                }
                            }

                            if (isWavedLock) { 
                                score = 100; hintMsg = "太完美了！這就是茶水間的手語！"; 
                            } else { 
                                score = 80; hintMsg = "杯子拿好了！請往上移動做出「喝水」的動作"; 
                            }
                        } else {
                            isWavedLock = false; handYHistory = [];
                            score = 40; hintMsg = "第二步：請比出「杯子」的形狀準備喝水";
                        }
                    } else {
                        score = 20; hintMsg = "請在畫面中比出杯子準備喝水";
                        isWavedLock = false; handYHistory = [];
                    }
                }
            }
          // ==========================================
            // ♻️ 資源回收 (雙步：嘴前比框框 -> 從外往內撥)
            // ==========================================
            else if (name === "資源回收") {
                if (currentStep === 1) {
                    if (results.multiHandLandmarks.length === 2) {
                        const hA = analyzeHandPose(results.multiHandLandmarks[0]);
                        const hB = analyzeHandPose(results.multiHandLandmarks[1]);
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        const calcRatios = (hand) => {
                            const wrist = hand.landmarks[0];
                            return {
                                thumb: getDist(wrist, hand.landmarks[4]) / getDist(wrist, hand.landmarks[2]),
                                idx: getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]),
                                mid: getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]),
                                rng: getDist(wrist, hand.landmarks[16]) / getDist(wrist, hand.landmarks[13]),
                                pnk: getDist(wrist, hand.landmarks[20]) / getDist(wrist, hand.landmarks[17])
                            };
                        };

                        const rA = calcRatios(hA);
                        const rB = calcRatios(hB);

                        const isFrame = (r) => (r.thumb > 1.3 && r.idx > 1.3 && r.mid < 1.1 && r.rng < 1.1 && r.pnk < 1.1);

                        if (isFrame(rA) && isFrame(rB)) {
                            const highestY = Math.min(hA.centerY, hB.centerY);
                            const isAligned = Math.abs(hA.centerY - hB.centerY) < 0.15;

                            // 🎯 第一步要求：限制 Y < 0.50，強迫框框必須放在嘴巴/臉部高度
                            if (highestY < 0.50 && isAligned) {
                                score = 100; hintMsg = "第一步「框框」正確！即將切換影片...";
                                if (!window.stepTimer) {
                                    window.stepTimer = setTimeout(() => {
                                        updateToStep(2, name); 
                                        handXHistory = []; window.stepTimer = null;
                                    }, 1000); 
                                }
                            } else {
                                if (!isAligned) {
                                    score = 80; hintMsg = "形狀正確！請確保雙手高度差不多平齊";
                                } else {
                                    // 高度不夠時，明確提示要放到嘴巴前
                                    score = 80; hintMsg = "形狀正確！請將雙手框框「放到嘴巴前面」";
                                }
                                clearTimeout(window.stepTimer); window.stepTimer = null;
                            }
                        } else {
                            score = 40; hintMsg = "第一步：雙手食指與大拇指張開成「框框」，其他三指收起";
                            clearTimeout(window.stepTimer); window.stepTimer = null;
                        }
                    } else {
                        score = 20; hintMsg = "第一步需要雙手一起比出「框框」喔！";
                        clearTimeout(window.stepTimer); window.stepTimer = null;
                    }
                } 
                else if (currentStep === 2) {
                    if (results.multiHandLandmarks.length === 2) {
                        const hA = analyzeHandPose(results.multiHandLandmarks[0]);
                        const hB = analyzeHandPose(results.multiHandLandmarks[1]);
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        // 🎯 針對你的完美數據客製化：只看手指伸展比例，不看手腕角度
                        const calcRatios = (hand) => {
                            const wrist = hand.landmarks[0];
                            return {
                                idx: getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]),
                                mid: getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]),
                                rng: getDist(wrist, hand.landmarks[16]) / getDist(wrist, hand.landmarks[13]),
                                pnk: getDist(wrist, hand.landmarks[20]) / getDist(wrist, hand.landmarks[17])
                            };
                        };

                        const rA = calcRatios(hA);
                        const rB = calcRatios(hB);

                        // 判斷四指伸直 (>1.3，完美契合你的 1.6~2.8 數據)
                        const isFlat = (r) => (r.idx > 1.3 && r.mid > 1.3 && r.rng > 1.3 && r.pnk > 1.3);

                        // 分辨上下手
                        let topHand = hA.centerY < hB.centerY ? hA : hB;
                        let botHand = hA.centerY < hB.centerY ? hB : hA;
                        
                        let rTop = hA.centerY < hB.centerY ? rA : rB;
                        let rBot = hA.centerY < hB.centerY ? rB : rA;

                        // 確保兩隻手有上下的落差 (> 0.15)
                        const isSeparated = (botHand.centerY - topHand.centerY) > 0.15;

                        if (isFlat(rTop) && isFlat(rBot) && isSeparated) {
                            // 專注追蹤「上方手」的水平移動
                            handXHistory.push(topHand.centerX); 
                            if (handXHistory.length > 20) handXHistory.shift();
                            
                            if (handXHistory.length > 5) {
                                // 判斷從外往內撥 (X軸有明顯位移，設定 0.05 舒適感最佳)
                                const moveX = Math.max(...handXHistory) - Math.min(...handXHistory);
                                if (moveX > 0.05) {
                                    isWavedLock = true;
                                }
                            }
                            
                            if (isWavedLock) { 
                                score = 100; hintMsg = "太完美了！這就是資源回收的手語！"; 
                            } else { 
                                score = 80; hintMsg = "準備完成！請將上面那隻手「從外往內撥」"; 
                            }
                        } else {
                            if (!isSeparated && isFlat(rTop) && isFlat(rBot)) {
                                score = 60; hintMsg = "請把雙手一上一下分開 (一手在上、一手在下)";
                            } else {
                                score = 40; hintMsg = "第二步：下方手平放，上方手「五指伸直」準備撥動";
                            }
                            isWavedLock = false; handXHistory = [];
                        }
                    } else {
                        isWavedLock = false; handXHistory = [];
                        score = 20; hintMsg = "第二步需要雙手一起操作喔！";
                    }
                }
            }
        // ==========================================
            // 🗄️ 置物櫃 (三步：空間拉開 -> 點擊 7 三次 -> 抗遮擋疊放)
            // ==========================================
            else if (name === "置物櫃") {
                // ================= 第一步：空間感拉開 (導入起始點鎖定機制) =================
                if (currentStep === 1) {
                    // 初始化鎖定狀態
                    if (typeof window.lockerPullReady === 'undefined') window.lockerPullReady = false;

                    if (results.multiHandLandmarks.length >= 1) {
                        const hand = analyzeHandPose(results.multiHandLandmarks[0]);
                        const wrist = hand.landmarks[0];
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        const idx = getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]);
                        const mid = getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]);
                        const rng = getDist(wrist, hand.landmarks[16]) / getDist(wrist, hand.landmarks[13]);
                        const pnk = getDist(wrist, hand.landmarks[20]) / getDist(wrist, hand.landmarks[17]);
                        
                        // 🎯 涵蓋所有拳頭：緊握 (數值很小) 或 鬆握 (<2.2) 都能通關
                        const isAnyFist = (idx < 2.2 && mid < 2.2 && rng < 2.2 && pnk < 2.2) || hand.isFist || hand.isLooseFist || hand.isLockerFist;

                        if (isAnyFist) {
                            // --- 階段一：要求使用者先停頓，記錄起始點 ---
                            if (!window.lockerPullReady) {
                                handXHistory.push(hand.centerX);
                                if (handXHistory.length > 15) handXHistory.shift();
                                
                                if (handXHistory.length > 10) {
                                    const moveX = Math.max(...handXHistory) - Math.min(...handXHistory);
                                    
                                    // 如果手在原地停留 (晃動 < 0.02)，就鎖定並記錄位置！
                                    if (moveX < 0.02) {
                                        window.lockerPullReady = true;
                                        window.lockerStartX = hand.centerX;   // 記錄起始 X 座標
                                        window.lockerStartSize = hand.size;   // 記錄起始大小 (深度)
                                        score = 80; hintMsg = "請將拳頭「往外或往旁邊」拉開";
                                    } else {
                                        score = 60; hintMsg = "請比出拳頭，放在胸前";
                                    }
                                } else {
                                    score = 60; hintMsg = "請比出拳頭，放在胸前";
                                }
                            } 
                            // --- 階段二：已經鎖定起始點，計算與起始點的落差 ---
                            else {
                                const moveX = Math.abs(hand.centerX - window.lockerStartX);
                                const sizeChange = Math.abs(hand.size - window.lockerStartSize);
                                
                                // 往旁邊拉 (X變動 > 0.05) 或 往身體拉 (Size變大 > 0.015)
                                if (moveX > 0.05 || sizeChange > 0.015) {
                                    isWavedLock = true;
                                }
                                
                                if (isWavedLock) {
                                    score = 100; hintMsg = "第一步開門正確！即將切換...";
                                    if (!window.stepTimer) {
                                        window.stepTimer = setTimeout(() => {
                                            updateToStep(2, name); 
                                            window.lockerPullReady = false; // 切換時重置
                                            handXHistory = []; 
                                            window.stepTimer = null;
                                        }, 1000); 
                                    }
                                } else {
                                    score = 80; hintMsg = "請將拳頭「往外或往旁邊」拉開";
                                }
                            }
                        } else {
                            window.lockerPullReady = false; // 手形跑掉就解除鎖定
                            isWavedLock = false; handXHistory = [];
                            score = 40; hintMsg = "第一步：請單手比出拳頭，準備拉門";
                            clearTimeout(window.stepTimer); window.stepTimer = null;
                        }
                    } else {
                        score = 20; hintMsg = "請將手放在畫面中準備";
                    }
                } 
                // ================= 第二步：點擊 7 三次 (導入寬鬆變形鎖定) =================
                else if (currentStep === 2) {
                    if (typeof window.clickCount === 'undefined') window.clickCount = 0;
                    if (typeof window.isClickingDown === 'undefined') window.isClickingDown = false;
                    if (typeof window.sevenReady === 'undefined') window.sevenReady = false;

                    if (results.multiHandLandmarks.length >= 1) {
                        const hand = analyzeHandPose(results.multiHandLandmarks[0]);
                        const wrist = hand.landmarks[0];
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        const thumb = getDist(wrist, hand.landmarks[4]) / getDist(wrist, hand.landmarks[2]);
                        const idx = getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]);
                        const mid = getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]);
                        const rng = getDist(wrist, hand.landmarks[16]) / getDist(wrist, hand.landmarks[13]);
                        const pnk = getDist(wrist, hand.landmarks[20]) / getDist(wrist, hand.landmarks[17]);
                        
                        // 1. 初始嚴格鎖定條件 (確保真的是 7)
                        const isStrictSeven = (thumb > 1.1 && idx > 1.2 && mid < 1.6 && rng < 1.6 && pnk < 1.6);
                        // 2. 🎯 點擊時的超級寬鬆條件：只要大拇指跟食指還有點樣子 (允許手變平、手指微彎)，就不會斷線！
                        const isRelaxedSeven = (thumb > 0.8 && idx > 0.8);

                        // 判斷鎖定
                        if (!window.sevenReady && isStrictSeven) {
                            window.sevenReady = true;
                            handYHistory = [];
                        } else if (window.sevenReady && !isRelaxedSeven) {
                            window.sevenReady = false; // 只有在手勢完全變形 (例如變拳頭或全張開) 時才解除鎖定
                        }

                        if (window.sevenReady) {
                            const currentTipY = hand.landmarks[8].y;
                            handYHistory.push(currentTipY);
                            if (handYHistory.length > 15) handYHistory.shift();

                            if (handYHistory.length > 5) {
                                const minY = Math.min(...handYHistory);
                                
                                // 判斷食指往下點 (超過 0.02)
                                if (!window.isClickingDown && (currentTipY - minY > 0.02)) {
                                    window.isClickingDown = true;
                                    window.lastClickY = currentTipY; 
                                }
                                // 判斷食指往上抬起 (超過 0.015)，完成一次點擊！
                                else if (window.isClickingDown && (window.lastClickY - currentTipY > 0.015)) {
                                    window.isClickingDown = false;
                                    window.clickCount++;
                                    handYHistory = []; 
                                }

                                if (window.clickCount >= 3) {
                                    isWavedLock = true;
                                }
                            }
                            
                            if (isWavedLock) {
                                score = 100; hintMsg = "點擊 3 次完成！即將切換...";
                                if (!window.stepTimer) {
                                    window.stepTimer = setTimeout(() => {
                                        updateToStep(3, name); 
                                        window.sevenReady = false; window.clickCount = 0; window.isClickingDown = false;
                                        handYHistory = []; window.stepTimer = null;
                                    }, 1000); 
                                }
                            } else {
                                score = 80; 
                                hintMsg = window.clickCount > 0 ? `已點擊 ${window.clickCount} 次，請繼續點！` : "已鎖定手勢！請用食指「連續點擊 3 次」";
                            }
                        } else {
                            score = 40; hintMsg = "第二步：請先比出標準的「7」讓系統鎖定";
                            handYHistory = [];
                        }
                    } else {
                        score = 20; hintMsg = "請將手放在畫面中比出「7」";
                        window.sevenReady = false;
                    }
                }
                // ================= 第三步：抗遮擋疊放 =================
               else if (currentStep === 3) {
                    // 🎯 關鍵修復 1：嚴格要求必須偵測到「雙手」，斷絕一隻手通關的可能
                    if (results.multiHandLandmarks.length === 2) {
                        const hA = analyzeHandPose(results.multiHandLandmarks[0]);
                        const hB = analyzeHandPose(results.multiHandLandmarks[1]);
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        const calcRatios = (hand) => {
                            const wrist = hand.landmarks[0];
                            return {
                                idx: getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]),
                                mid: getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]),
                                rng: getDist(wrist, hand.landmarks[16]) / getDist(wrist, hand.landmarks[13]),
                                pnk: getDist(wrist, hand.landmarks[20]) / getDist(wrist, hand.landmarks[17])
                            };
                        };
                        const rA = calcRatios(hA);
                        const rB = calcRatios(hB);
                        
                        // 攤平判定：根據你的完美數據 (皆大於 1.7)，我們設定 > 1.3 確保穩定
                        const isFlat = (r) => (r.idx > 1.3 && r.mid > 1.3 && r.rng > 1.3 && r.pnk > 1.3);

                        if (isFlat(rA) && isFlat(rB)) {
                            let topHand = hA.centerY < hB.centerY ? hA : hB;
                            let botHand = hA.centerY < hB.centerY ? hB : hA;
                            
                            // 追蹤雙手掌心距離
                            const palmDist = getDist(topHand.landmarks[9], botHand.landmarks[9]);
                            
                            // 追蹤上方手 Y 座標 (往下蓋) 與 掌心距離 (越蓋越近)
                            handYHistory.push(topHand.centerY);
                            handXHistory.push(palmDist); 
                            
                            if (handYHistory.length > 20) handYHistory.shift();
                            if (handXHistory.length > 20) handXHistory.shift();
                            
                            if (handYHistory.length > 5) {
                                const minY = Math.min(...handYHistory);
                                
                                // 🎯 關鍵修復 2：上方手必須往下移動 (>0.04) 且 最終雙手掌心距離要夠近 
                                // (設定 < 0.15，完美吻合你提供的 0.120 數據)
                                if (topHand.centerY - minY > 0.04 && palmDist < 0.15) {
                                    isWavedLock = true;
                                }
                            }

                            if (isWavedLock) { 
                                score = 100; hintMsg = "太完美了！這就是置物櫃的完整手語！"; 
                            } else { 
                                score = 80; hintMsg = "準備好後，請將上方的手「往下蓋到下方手上」"; 
                            }
                        } else {
                            isWavedLock = false; handYHistory = []; handXHistory = [];
                            score = 40; hintMsg = "第三步：請將「雙手」攤平，一上一下準備拍合";
                        }
                    } else {
                        isWavedLock = false; handYHistory = []; handXHistory = [];
                        score = 20; hintMsg = "第三步：必須在畫面中看到「雙手」喔！";
                    }
                }
            }
      // ==========================================
            // 📚 圖書館 (三步：先合再開翻書 -> 比二往內收 -> 微彎往下)
            // ==========================================
            else if (name === "圖書館") {
                // ================= 第一步：翻書 (抗遮擋：先合再開) =================
                if (currentStep === 1) {
                    // 初始化翻書鎖定狀態
                    if (typeof window.libBookReady === 'undefined') window.libBookReady = false;

                    const numHands = results.multiHandLandmarks.length;

                    if (numHands >= 1) {
                        const hA = analyzeHandPose(results.multiHandLandmarks[0]);
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        // 寬鬆攤平判定 (不握拳即可)
                        const checkFlat = (hand) => {
                            const wrist = hand.landmarks[0];
                            const idx = getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]);
                            const mid = getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]);
                            return (idx > 1.2 && mid > 1.2); 
                        };

                        // --- 階段一：要求雙手先「合併靠攏」 ---
                        if (!window.libBookReady) {
                            let isMerged = false;
                            
                            // 🎯 智慧抗遮擋：如果只抓到一隻手，但形狀是攤平的，我們就假設這是「雙手完美合十」被遮擋了！
                            if (numHands === 1) {
                                if (checkFlat(hA)) isMerged = true;
                            } 
                            // 正常情況下看到兩隻手，則判斷距離是否夠近
                            else if (numHands === 2) {
                                const hB = analyzeHandPose(results.multiHandLandmarks[1]);
                                const palmDist = getDist(hA.landmarks[9], hB.landmarks[9]);
                                if (checkFlat(hA) && checkFlat(hB) && palmDist < 0.15) {
                                    isMerged = true;
                                }
                            }

                            if (isMerged) {
                                // 給予一點緩衝避免閃爍
                                handXHistory.push(1);
                                if (handXHistory.length > 15) handXHistory.shift();
                                
                                if (handXHistory.length > 5) {
                                    window.libBookReady = true;
                                    score = 80; hintMsg = "已鎖定！請像翻書一樣將雙手「往外打開」";
                                } else {
                                    score = 60; hintMsg = "雙手已靠攏，請「停頓一下」讓系統鎖定";
                                }
                            } else {
                                handXHistory = [];
                                score = 60; hintMsg = "請先將雙手「攤平並合併靠攏」準備翻書";
                            }
                        } 
                        // --- 階段二：雙手往外打開 ---
                        else {
                            // 只要打開時看到兩隻手，並且距離拉開，就算翻書成功！
                            if (numHands === 2) {
                                const hB = analyzeHandPose(results.multiHandLandmarks[1]);
                                const palmDist = getDist(hA.landmarks[9], hB.landmarks[9]);
                                
                                // 拉開距離大於 0.2 就算打開
                                if (palmDist > 0.2) {
                                    isWavedLock = true;
                                }
                            }
                            
                            if (isWavedLock) {
                                score = 100; hintMsg = "第一步翻書正確！即將切換...";
                                if (!window.stepTimer) {
                                    window.stepTimer = setTimeout(() => {
                                        updateToStep(2, name);
                                        window.libBookReady = false; 
                                        handXHistory = []; window.stepTimer = null;
                                    }, 1000);
                                }
                            } else {
                                score = 80; hintMsg = "已鎖定！請像翻書一樣將雙手「往外打開」";
                            }
                        }
                    } else {
                        window.libBookReady = false; handXHistory = []; isWavedLock = false;
                        score = 20; hintMsg = "第一步：請將手放在畫面中準備";
                    }
                }
                // ================= 第二步：比二往內收 (指尖碰觸 + 深度偵測) =================
                else if (currentStep === 2) {
                    // 初始化內收鎖定狀態
                    if (typeof window.libInwardReady === 'undefined') window.libInwardReady = false;

                    if (results.multiHandLandmarks.length >= 1) {
                        const hand = analyzeHandPose(results.multiHandLandmarks[0]);
                        const wrist = hand.landmarks[0];
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

                        const idx = getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]);
                        const mid = getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]);
                        const rng = getDist(wrist, hand.landmarks[16]) / getDist(wrist, hand.landmarks[13]);
                        const pnk = getDist(wrist, hand.landmarks[20]) / getDist(wrist, hand.landmarks[17]);
                        
                        // 🎯 判斷大拇指靠在中指上 (大拇指尖端 4，到中指第二關節 10 的距離)
                        const thumbToMid = getDist(hand.landmarks[4], hand.landmarks[10]) / hand.size;

                        // 判斷形狀：食指、中指伸出，無名、小指收合，且大拇指靠在中指 (<0.6 為寬鬆容錯)
                        const isTwoShape = (idx > 1.2 && mid > 1.2 && rng < 1.5 && pnk < 1.5 && thumbToMid < 0.6);

                        if (isTwoShape) {
                            // --- 階段一：要求在胸前定格鎖定 ---
                            if (!window.libInwardReady) {
                                platformSizeHistory.push(hand.size);
                                if (platformSizeHistory.length > 15) platformSizeHistory.shift();

                                if (platformSizeHistory.length > 10) {
                                    const sizeChange = Math.max(...platformSizeHistory) - Math.min(...platformSizeHistory);
                                    
                                    if (sizeChange < 0.005) { 
                                        window.libInwardReady = true;
                                        score = 80; hintMsg = "手勢正確！請將手「往身體方向移動」";
                                    } else {
                                        score = 60; hintMsg = "手勢正確！請在胸前「停頓一下」讓系統鎖定";
                                    }
                                } else {
                                    score = 60; hintMsg = "手勢正確！請在胸前「停頓一下」讓系統鎖定";
                                }
                            } 
                            // --- 階段二：偵測往內收 (深度變遠) ---
                            else {
                                // 持續記錄大小軌跡
                                platformSizeHistory.push(hand.size);
                                if (platformSizeHistory.length > 20) platformSizeHistory.shift();

                                if (platformSizeHistory.length > 5) {
                                    const maxSize = Math.max(...platformSizeHistory);
                                    
                                    // 🎯 深度魔法：當手往身體方向收時，會離鏡頭變遠，Size 就會縮小
                                    // 只要歷史最大值 減去 現在的大小 > 0.012，就算成功往身體移動！
                                    if (maxSize - hand.size > 0.012) {
                                        isWavedLock = true;
                                    }
                                }

                                if (isWavedLock) {
                                    score = 100; hintMsg = "第二步內收正確！即將切換...";
                                    if (!window.stepTimer) {
                                        window.stepTimer = setTimeout(() => {
                                            updateToStep(3, name);
                                            window.libInwardReady = false;
                                            platformSizeHistory = []; window.stepTimer = null;
                                        }, 1000);
                                    }
                                } else {
                                    score = 80; hintMsg = "已鎖定！請將手「往身體方向移動」(離鏡頭變遠)";
                                }
                            }
                        } else {
                            window.libInwardReady = false; platformSizeHistory = []; isWavedLock = false;
                            
                            // 💡 智能除錯提示
                            if (idx > 1.2 && mid > 1.2 && thumbToMid >= 0.6) {
                                score = 60; hintMsg = "請記得把「大拇指」靠在「中指」上喔！";
                            } else {
                                score = 40; hintMsg = "第二步：請比出「2」，並將大拇指靠在中指上";
                            }
                        }
                    } else {
                        window.libInwardReady = false; platformSizeHistory = []; isWavedLock = false;
                        score = 20; hintMsg = "請將手放在畫面中比出「2」";
                    }
                }
                // ================= 第三步：地方 (往下移動) =================
                else if (currentStep === 3) {
                    if (results.multiHandLandmarks.length >= 1) {
                        const hand = analyzeHandPose(results.multiHandLandmarks[0]);
                        const wrist = hand.landmarks[0];
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        const idx = getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]);
                        const mid = getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]);
                        const rng = getDist(wrist, hand.landmarks[16]) / getDist(wrist, hand.landmarks[13]);
                        const pnk = getDist(wrist, hand.landmarks[20]) / getDist(wrist, hand.landmarks[17]);

                        // 判斷四指伸出 (攤平往下蓋)
                        const isPlaceShape = (idx > 1.3 && mid > 1.3 && rng > 1.3 && pnk > 1.3);

                        if (isPlaceShape) {
                            handYHistory.push(hand.centerY);
                            if (handYHistory.length > 20) handYHistory.shift();

                            if (handYHistory.length > 5) {
                                const minY = Math.min(...handYHistory);
                                // 判斷往下蓋 (Y 座標變大)
                                if (hand.centerY - minY > 0.04) {
                                    isWavedLock = true;
                                }
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "太完美了！這就是圖書館的完整手語！";
                            } else {
                                score = 80; hintMsg = "姿勢正確！請將手「往下移動」比出地方";
                            }
                        } else {
                            score = 40; hintMsg = "第三步：請將手心朝下攤平，準備往下蓋";
                            isWavedLock = false; handYHistory = [];
                        }
                    } else {
                        score = 20; hintMsg = "請將手放在畫面中比出地方";
                        isWavedLock = false; handYHistory = [];
                    }
                }
            }
  // ==========================================
            // 🏟️ 體育館 (雙步：舉啞鈴 -> 往下蓋(地方))
            // ==========================================
            else if (name === "體育館") {
                if (currentStep === 1) {
                    if (results.multiHandLandmarks.length === 2) {
                        const hA = analyzeHandPose(results.multiHandLandmarks[0]);
                        const hB = analyzeHandPose(results.multiHandLandmarks[1]);
                        
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        // 檢查是否為握拳 (根據數據：四指比例皆小於 1.0)
                        const checkFist = (hand) => {
                            const wrist = hand.landmarks[0];
                            const idx = getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]);
                            const mid = getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]);
                            const rng = getDist(wrist, hand.landmarks[16]) / getDist(wrist, hand.landmarks[13]);
                            const pnk = getDist(wrist, hand.landmarks[20]) / getDist(wrist, hand.landmarks[17]);
                            return (idx < 1.0 && mid < 1.0 && rng < 1.0 && pnk < 1.0);
                        };

                        if (checkFist(hA) && checkFist(hB)) {
                            // 💡 新增高度限制：確保雙手舉高在頭部兩側 (Y 座標較小)
                            // 根據你測出的數據 (0.47 與 0.50)，我們設定 < 0.55 作為舒適的判定範圍
                            if (hA.centerY < 0.55 && hB.centerY < 0.55) {
                                // 追蹤雙手的 Y 軸平均高度
                                const avgY = (hA.centerY + hB.centerY) / 2;
                                handYHistory.push(avgY);
                                if (handYHistory.length > 20) handYHistory.shift();
                                
                                // 判斷上下擺動：尋找最高點與最低點的落差 (> 0.05)
                                if (handYHistory.length > 5) {
                                    const moveY = Math.max(...handYHistory) - Math.min(...handYHistory);
                                    if (moveY > 0.05) { 
                                        isWavedLock = true;
                                    }
                                }

                                if (isWavedLock) {
                                    score = 100; hintMsg = "第一步正確！即將切換...";
                                    if (!window.stepTimer) {
                                        window.stepTimer = setTimeout(() => {
                                            updateToStep(2, name);
                                            handYHistory = []; window.stepTimer = null;
                                        }, 1000);
                                    }
                                } else {
                                    score = 80; hintMsg = "位置正確！請將雙手「上下擺動」像舉啞鈴一樣";
                                }
                            } else {
                                // 雖然有握拳，但是放太低了
                                score = 60; hintMsg = "請把雙拳「舉高到頭部兩側」喔！";
                                handYHistory = []; // 手放下來就重置擺動軌跡，避免作弊
                            }
                        } else {
                            score = 40; hintMsg = "第一步：請雙手握拳，放在頭部兩側";
                            isWavedLock = false;
                        }
                    } else {
                        score = 20; hintMsg = "舉啞鈴需要「雙手」一起喔！";
                        isWavedLock = false;
                    }
                }
                else if (currentStep === 2) {
                    // 直接完美沿用圖書館 Step 3 的「地方」手勢邏輯
                    const hand = analyzeHandPose(results.multiHandLandmarks[0]);
                    const wrist = hand.landmarks[0];
                    const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                    
                    const indexRatio = getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]);
                    const middleRatio = getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]);
                    const ringRatio = getDist(wrist, hand.landmarks[16]) / getDist(wrist, hand.landmarks[13]);
                    const pinkyRatio = getDist(wrist, hand.landmarks[20]) / getDist(wrist, hand.landmarks[17]);

                    // 四指明顯伸出 (> 1.5)
                    const isPlaceShape = (indexRatio > 1.5) && (middleRatio > 1.5) && (ringRatio > 1.5) && (pinkyRatio > 1.5);

                    if (isPlaceShape) {
                        handYHistory.push(hand.centerY);
                        if (handYHistory.length > 20) handYHistory.shift();

                        const minY = Math.min(...handYHistory);
                        
                        // 判斷往下蓋：Y 軸座標變大 (往下移動超過 0.04)
                        if (handYHistory.length > 5 && (hand.centerY - minY > 0.04)) {
                            isWavedLock = true;
                        }

                        if (isWavedLock) {
                            score = 100; hintMsg = "太完美了！這就是體育館的完整手語！";
                        } else {
                            score = 80; hintMsg = "姿勢正確！請將手「往下移動」比出地方";
                        }
                    } else {
                        score = 40; hintMsg = "第二步：請將手心朝下攤平，準備往下蓋";
                        isWavedLock = false;
                    }
                }
            }

     // ==========================================
            // 🏫 學校 (單步連擊版：蓋屋頂 -> 時鐘轉一圈)
            // ==========================================
            else if (name === "學校") {
                if (currentStep === 1) {
                    // 用內部記憶記住「屋頂」是否已經完成了
                    if (typeof window.schoolRoofDone === 'undefined') window.schoolRoofDone = false;

                    // --- 階段一：蓋屋頂 ---
                    if (!window.schoolRoofDone) {
                        if (results.multiHandLandmarks.length === 2) {
                            const hA = analyzeHandPose(results.multiHandLandmarks[0]);
                            const hB = analyzeHandPose(results.multiHandLandmarks[1]);
                            const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                            
                            if (!hA.isFist && !hA.isLockerFist && !hB.isFist && !hB.isLockerFist) {
                                const tipDist = getDist(hA.landmarks[8], hB.landmarks[8]);
                                const palmDist = getDist(hA.landmarks[9], hB.landmarks[9]);
                                const yDiff = Math.abs(hA.centerY - hB.centerY);

                                if (tipDist < 0.04 && palmDist > 0.150 && yDiff < 0.04) {
                                    window.schoolRoofDone = true; // 屋頂過關！
                                    handXHistory = []; handYHistory = []; // 清空軌跡準備轉圈
                                } else {
                                    score = 50; hintMsg = "姿勢對了！請將雙手「指尖斜斜地相碰」，蓋出屋頂";
                                }
                            } else {
                                score = 20; hintMsg = "請攤平雙手，斜斜地相碰蓋出屋頂";
                            }
                        } else {
                            score = 10; hintMsg = "比屋頂需要「雙手」一起喔！";
                        }
                    } 
                    // --- 階段二：轉時鐘 ---
                    else {
                        // 抓取畫面上的一隻手來判定轉圈
                        const hand = analyzeHandPose(results.multiHandLandmarks[0]);
                        const tipX = hand.landmarks[8].x;
                        const tipY = hand.landmarks[8].y;
                        
                        handXHistory.push(tipX);
                        handYHistory.push(tipY);
                        
                        if (handXHistory.length > 30) handXHistory.shift();
                        if (handYHistory.length > 30) handYHistory.shift();
                        
                        if (handXHistory.length > 10) {
                            const moveX = Math.max(...handXHistory) - Math.min(...handXHistory);
                            const moveY = Math.max(...handYHistory) - Math.min(...handYHistory);
                            
                            // X 和 Y 軸都有大於 0.05 的明顯位移，代表有在畫圓
                            if (moveX > 0.05 && moveY > 0.05) {
                                isWavedLock = true;
                            }
                        }
                        
                        if (isWavedLock) {
                            score = 100; hintMsg = "太完美了！這就是學校的完整手語！";
                        } else {
                            score = 80; hintMsg = "屋頂完成！接著請以手腕為軸心，轉一圈表示「時鐘」";
                        }
                    }
                }
            }

            // ==========================================
            // 🍽️ 餐廳 (雙步：吃飯 -> 往下蓋(地方))
            // ==========================================
            else if (name === "餐廳") {
                if (currentStep === 1) {
                    if (results.multiHandLandmarks.length === 2) {
                        const hA = analyzeHandPose(results.multiHandLandmarks[0]);
                        const hB = analyzeHandPose(results.multiHandLandmarks[1]);
                        
                        // 聰明分類：Y 座標比較小的是在上面的手(拿餐具)，比較大的是在下面的手(端碗)
                        const topHand = hA.centerY < hB.centerY ? hA : hB;
                        const bottomHand = hA.centerY < hB.centerY ? hB : hA;

                        // 檢查雙手都不是握拳 (端碗和拿筷子/湯匙時手指都會微彎伸展)
                        if (!topHand.isFist && !topHand.isLockerFist && !bottomHand.isFist && !bottomHand.isLockerFist) {
                            
                            // 專注追蹤「上方手」的 Y 軸高度變化
                            handYHistory.push(topHand.centerY);
                            if (handYHistory.length > 20) handYHistory.shift();

                            // 判斷扒飯：尋找最高點與最低點的落差 (> 0.04)
                            if (handYHistory.length > 5) {
                                const moveY = Math.max(...handYHistory) - Math.min(...handYHistory);
                                
                                // 加上高度條件：上方手必須舉得夠高 (靠近臉部，例如 Y < 0.5)
                                if (moveY > 0.04 && topHand.centerY < 0.5) { 
                                    isWavedLock = true;
                                }
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "第一步正確！即將切換...";
                                if (!window.stepTimer) {
                                    window.stepTimer = setTimeout(() => {
                                        updateToStep(2, name);
                                        handYHistory = []; window.stepTimer = null;
                                    }, 1000);
                                }
                            } else {
                                score = 80; hintMsg = "準備完成！請將上方的手「往嘴巴揮動」模擬吃飯";
                            }
                        } else {
                            score = 40; hintMsg = "第一步：請一手在下端碗、一手在上作勢吃飯";
                            isWavedLock = false;
                        }
                    } else {
                        score = 20; hintMsg = "吃飯的動作需要「雙手」配合喔！";
                        isWavedLock = false;
                        handYHistory = []; // 單手就重置扒飯軌跡
                    }
                }
                else if (currentStep === 2) {
                    // 完美沿用圖書館/體育館的「地方」手勢邏輯
                    const hand = analyzeHandPose(results.multiHandLandmarks[0]);
                    const wrist = hand.landmarks[0];
                    const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                    
                    const indexRatio = getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]);
                    const middleRatio = getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]);
                    const ringRatio = getDist(wrist, hand.landmarks[16]) / getDist(wrist, hand.landmarks[13]);
                    const pinkyRatio = getDist(wrist, hand.landmarks[20]) / getDist(wrist, hand.landmarks[17]);

                    // 四指明顯伸出 (> 1.5)
                    const isPlaceShape = (indexRatio > 1.5) && (middleRatio > 1.5) && (ringRatio > 1.5) && (pinkyRatio > 1.5);

                    if (isPlaceShape) {
                        handYHistory.push(hand.centerY);
                        if (handYHistory.length > 20) handYHistory.shift();

                        const minY = Math.min(...handYHistory);
                        
                        // 判斷往下蓋：Y 軸座標變大 (往下移動超過 0.04)
                        if (handYHistory.length > 5 && (hand.centerY - minY > 0.04)) {
                            isWavedLock = true;
                        }

                        if (isWavedLock) {
                            score = 100; hintMsg = "太完美了！這就是餐廳的完整手語！";
                        } else {
                            score = 80; hintMsg = "姿勢正確！請將手「往下移動」比出地方";
                        }
                    } else {
                        score = 40; hintMsg = "第二步：請將手心朝下攤平，準備往下蓋";
                        isWavedLock = false;
                    }
                }
            }
            // ==========================================
            // 🏞️ 公園 (雙步：一手高一手低 -> 雙手齊平前後擺動)
            // ==========================================
            else if (name === "公園") {
                if (currentStep === 1) {
                    if (results.multiHandLandmarks.length === 2) {
                        const hA = analyzeHandPose(results.multiHandLandmarks[0]);
                        const hB = analyzeHandPose(results.multiHandLandmarks[1]);
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        // 分辨上下手
                        const topHand = hA.centerY < hB.centerY ? hA : hB;
                        const bottomHand = hA.centerY < hB.centerY ? hB : hA;

                        // 判斷 1：一手高一手低 (根據你的數據，Y差高達 0.38，我們設定 > 0.25 就算過關)
                        const yDiff = bottomHand.centerY - topHand.centerY;
                        
                        // 判斷 2：食指有伸出 (你的數據顯示食指比例皆大於 1.9)
                        const topIdx = getDist(topHand.landmarks[0], topHand.landmarks[8]) / getDist(topHand.landmarks[0], topHand.landmarks[5]);
                        const botIdx = getDist(bottomHand.landmarks[0], bottomHand.landmarks[8]) / getDist(bottomHand.landmarks[0], bottomHand.landmarks[5]);

                        if (yDiff > 0.25 && topIdx > 1.5 && botIdx > 1.5) {
                            isWavedLock = true;
                        }

                        if (isWavedLock) {
                            score = 100; hintMsg = "第一步正確！即將切換...";
                            if (!window.stepTimer) {
                                window.stepTimer = setTimeout(() => {
                                    updateToStep(2, name);
                                    platformSizeHistory = []; window.stepTimer = null;
                                }, 1000);
                            }
                        } else {
                            if (yDiff > 0.25) {
                                score = 80; hintMsg = "高度正確！請比出對應的手勢";
                            } else {
                                score = 40; hintMsg = "第一步：請將一隻手舉高，另一隻手放低";
                            }
                        }
                    } else {
                        score = 20; hintMsg = "第一步需要「雙手」一起喔！";
                        isWavedLock = false;
                    }
                }
                else if (currentStep === 2) {
                    if (results.multiHandLandmarks.length === 2) {
                        const hA = analyzeHandPose(results.multiHandLandmarks[0]);
                        const hB = analyzeHandPose(results.multiHandLandmarks[1]);
                        
                        // 確保雙手高度接近 (根據數據，雙手 Y 差只有 0.007，我們給予 < 0.15 的容錯)
                        const yDiff = Math.abs(hA.centerY - hB.centerY);
                        
                        if (yDiff < 0.15) {
                            // 💡 前後擺動偵測：追蹤雙手平均 Size 的縮放變化
                            const avgSize = (hA.size + hB.size) / 2;
                            platformSizeHistory.push(avgSize);
                            if (platformSizeHistory.length > 20) platformSizeHistory.shift();

                            if (platformSizeHistory.length > 5) {
                                const sizeChange = Math.max(...platformSizeHistory) - Math.min(...platformSizeHistory);
                                
                                // 當手前後擺動時，size 會有明顯變化 (設定 0.015 非常靈敏且防雜訊)
                                if (sizeChange > 0.015) {
                                    isWavedLock = true;
                                }
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "太完美了！這就是公園的完整手語！";
                            } else {
                                score = 80; hintMsg = "姿勢正確！請將雙手「前後擺動」";
                            }
                        } else {
                            score = 40; hintMsg = "第二步：請將雙手放在胸前平齊，準備前後擺動";
                            isWavedLock = false;
                        }
                    } else {
                        score = 20; hintMsg = "前後擺動需要「雙手」一起喔！";
                        isWavedLock = false;
                        platformSizeHistory = []; // 單手時重置擺動軌跡
                    }
                }
            }
// ==========================================
            // 🚏 公車站 (單步：嚴格要求 上方OK、下方1)
            // ==========================================
            else if (name === "公車站") {
                if (results.multiHandLandmarks.length === 2) {
                    const hA = analyzeHandPose(results.multiHandLandmarks[0]);
                    const hB = analyzeHandPose(results.multiHandLandmarks[1]);
                    const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                    
                    const calcRatios = (hand) => {
                        const wrist = hand.landmarks[0];
                        return {
                            idx: getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]),
                            mid: getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]),
                            rng: getDist(wrist, hand.landmarks[16]) / getDist(wrist, hand.landmarks[13]),
                            pnk: getDist(wrist, hand.landmarks[20]) / getDist(wrist, hand.landmarks[17])
                        };
                    };

                    const rA = calcRatios(hA);
                    const rB = calcRatios(hB);

                    // 定義兩種手型
                    const isOK = (r) => (r.idx < 1.5 && r.mid > 1.3 && r.rng > 1.3 && r.pnk > 1.3);
                    const isOne = (r) => (r.idx > 1.2 && r.mid < 1.1 && r.rng < 1.1 && r.pnk < 1.1);

                    let okHand = null;
                    let oneHand = null;

                    // 先找出畫面中有沒有這兩隻手，不用管誰上誰下
                    if (isOK(rA) && isOne(rB)) {
                        okHand = hA; oneHand = hB;
                    } else if (isOK(rB) && isOne(rA)) {
                        okHand = hB; oneHand = hA;
                    }

                    // 如果兩種手型都有出現，才來嚴格審查「位置」
                    if (okHand && oneHand) {
                        
                        // 計算 1 和 OK 的垂直落差 (Y座標：越往下數值越大)
                        // 我們要確保 oneHand (1) 的 Y 座標，比 okHand (OK) 大很多
                        const yDiff = oneHand.centerY - okHand.centerY;

                        // 💡 嚴格垂直審查：落差必須大於 0.15，才算是「一上一下」，否則就是「左右平放」
                        if (yDiff > 0.15) {
                            
                            // 利用陣列當作「穩定度計時器」，避免雜訊閃爍
                            handXHistory.push(1);
                            if (handXHistory.length > 20) handXHistory.shift();

                            if (handXHistory.length > 5) {
                                isWavedLock = true;
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "太完美了！這就是公車站的手語！";
                            } else {
                                score = 80; hintMsg = "姿勢完全正確！請「保持動作」一下下...";
                            }

                        } else {
                            // 手型對了，但位置不對
                            if (yDiff < -0.15) {
                                score = 60; hintMsg = "上下顛倒了！請把「OK 放上面」，「1 放下面」";
                            } else {
                                // yDiff 介於 -0.15 到 0.15 之間，代表兩隻手太靠近或是左右平放
                                score = 60; hintMsg = "請把手「一上一下」擺放喔！不要放在左右兩側";
                            }
                            isWavedLock = false;
                            handXHistory = [];
                        }

                    } else {
                        score = 40; hintMsg = "請將上方手比出「OK」，下方手比出「1」，並放在胸前";
                        isWavedLock = false;
                        handXHistory = [];
                    }
                } else {
                    score = 20; hintMsg = "公車站需要「雙手」一起比喔！";
                    isWavedLock = false;
                    handXHistory = [];
                }
            }

            // ==========================================
            // 🚇 捷運 (雙步：雙手伸出食中指往前推 -> 往下蓋(地方))
            // ==========================================
            else if (name === "捷運") {
                if (currentStep === 1) {
                    if (results.multiHandLandmarks.length === 2) {
                        const hA = analyzeHandPose(results.multiHandLandmarks[0]);
                        const hB = analyzeHandPose(results.multiHandLandmarks[1]);
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        const calcRatios = (hand) => {
                            const wrist = hand.landmarks[0];
                            return {
                                idx: getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]),
                                mid: getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]),
                                rng: getDist(wrist, hand.landmarks[16]) / getDist(wrist, hand.landmarks[13]),
                                pnk: getDist(wrist, hand.landmarks[20]) / getDist(wrist, hand.landmarks[17])
                            };
                        };

                        const rA = calcRatios(hA);
                        const rB = calcRatios(hB);

                        // 判斷手勢：食指、中指伸展 (> 1.2)，無名指、小指收合 (< 1.1)
                        const isTrackShape = (r) => (r.idx > 1.2 && r.mid > 1.2 && r.rng < 1.1 && r.pnk < 1.1);

                        if (isTrackShape(rA) && isTrackShape(rB)) {
                            // 判斷往前移動：追蹤雙手平均 Size，往前推會變大
                            const avgSize = (hA.size + hB.size) / 2;
                            platformSizeHistory.push(avgSize);
                            if (platformSizeHistory.length > 20) platformSizeHistory.shift();

                            if (platformSizeHistory.length > 5) {
                                // 找出軌跡中的最小值，看現在是不是比最小值變大了
                                const minSize = Math.min(...platformSizeHistory);
                                
                                // 當手往前推時，size 會有明顯變大 (設定 0.02 的靈敏度)
                                if (avgSize - minSize > 0.02) {
                                    isWavedLock = true;
                                }
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "第一步正確！即將切換...";
                                if (!window.stepTimer) {
                                    window.stepTimer = setTimeout(() => {
                                        updateToStep(2, name);
                                        platformSizeHistory = []; handYHistory = []; window.stepTimer = null;
                                    }, 1000);
                                }
                            } else {
                                score = 80; hintMsg = "手勢正確！請將雙手「往前推」模擬捷運行進";
                            }
                        } else {
                            score = 40; hintMsg = "第一步：雙手比出軌道手勢 (食指與中指伸出，其餘收合)";
                            isWavedLock = false;
                        }
                    } else {
                        score = 20; hintMsg = "捷運的第一步需要「雙手」一起喔！";
                        isWavedLock = false;
                        platformSizeHistory = [];
                    }
                }
                else if (currentStep === 2) {
                    // 完美沿用「地方」的向下蓋手勢邏輯
                    const hand = analyzeHandPose(results.multiHandLandmarks[0]);
                    const wrist = hand.landmarks[0];
                    const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                    
                    const indexRatio = getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]);
                    const middleRatio = getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]);
                    const ringRatio = getDist(wrist, hand.landmarks[16]) / getDist(wrist, hand.landmarks[13]);
                    const pinkyRatio = getDist(wrist, hand.landmarks[20]) / getDist(wrist, hand.landmarks[17]);

                    // 四指明顯伸出 (> 1.5) 代表手掌朝下蓋
                    const isPlaceShape = (indexRatio > 1.5) && (middleRatio > 1.5) && (ringRatio > 1.5) && (pinkyRatio > 1.5);

                    if (isPlaceShape) {
                        handYHistory.push(hand.centerY);
                        if (handYHistory.length > 20) handYHistory.shift();

                        const minY = Math.min(...handYHistory);
                        
                        // 判斷往下蓋：Y 軸座標變大 (往下移動超過 0.04)
                        if (handYHistory.length > 5 && (hand.centerY - minY > 0.04)) {
                            isWavedLock = true;
                        }

                        if (isWavedLock) {
                            score = 100; hintMsg = "太完美了！這就是捷運的完整手語！";
                        } else {
                            score = 80; hintMsg = "姿勢正確！請將手「往下移動」比出地方";
                        }
                    } else {
                        score = 40; hintMsg = "第二步：請將手心朝下攤平，準備往下蓋";
                        isWavedLock = false;
                    }
                }
            }

 // ==========================================
            // ✈️ 機場 (雙步：先鎖定飛機形狀 -> 無視變形斜上飛 -> 往下蓋)
            // ==========================================
            else if (name === "機場") {
                if (currentStep === 1) {
                    // 初始化狀態記憶
                    if (typeof window.airplaneReady === 'undefined') window.airplaneReady = false;

                    if (results.multiHandLandmarks.length >= 1) {
                        const hand = analyzeHandPose(results.multiHandLandmarks[0]);
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

                        // --- 階段一：還沒鎖定前，嚴格檢查飛機形狀 ---
                        if (!window.airplaneReady) {
                            const calcRatios = (h) => {
                                const wrist = h.landmarks[0];
                                return {
                                    idx: getDist(wrist, h.landmarks[8]) / getDist(wrist, h.landmarks[5]),
                                    mid: getDist(wrist, h.landmarks[12]) / getDist(wrist, h.landmarks[9]),
                                    rng: getDist(wrist, h.landmarks[16]) / getDist(wrist, h.landmarks[13]),
                                    pnk: getDist(wrist, h.landmarks[20]) / getDist(wrist, h.landmarks[17])
                                };
                            };
                            const r = calcRatios(hand);

                            // 嚴格飛機形狀：壓下食指(idx<1.3)與無名指(rng<1.3)，伸出中指(mid>1.2)與小指(pnk>1.2)
                            const isAirplaneShape = (r.idx < 1.3) && (r.mid > 1.2) && (r.rng < 1.3) && (r.pnk > 1.2);

                            if (isAirplaneShape) {
                                window.airplaneReady = true; // 🎯 鎖定狀態！
                                handXHistory = [hand.centerX]; // 記錄起點
                                handYHistory = [hand.centerY];
                                score = 80; hintMsg = "飛機已鎖定！請轉側面「斜往上滑動」起飛 (姿勢跑掉也沒關係)";
                            } else {
                                score = 40; hintMsg = "第一步：請先對著鏡頭比出「飛機」手勢以鎖定";
                                handXHistory = []; handYHistory = [];
                            }
                        }
                        // --- 階段二：已經鎖定飛機，現在「完全無視手指形狀」，只看手掌軌跡 ---
                        else {
                            handXHistory.push(hand.centerX);
                            handYHistory.push(hand.centerY);
                            if (handXHistory.length > 30) handXHistory.shift();
                            if (handYHistory.length > 30) handYHistory.shift();

                            const startX = handXHistory[0];
                            const startY = handYHistory[0];
                            const endX = hand.centerX;
                            const endY = hand.centerY;

                            const movedUp = startY - endY;
                            const movedSide = Math.abs(endX - startX);

                            // 側邊飛機軌跡判定
                            if (movedUp > 0.12 && movedSide > 0.08) {
                                isWavedLock = true;
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "第一步起飛正確！即將切換...";
                                if (!window.stepTimer) {
                                    window.stepTimer = setTimeout(() => {
                                        updateToStep(2, name);
                                        window.airplaneReady = false; // 切換步驟時重置
                                        handXHistory = []; handYHistory = []; window.stepTimer = null;
                                    }, 1000);
                                }
                            } else {
                                score = 80; hintMsg = "飛機已鎖定！請「斜往上滑動」起飛";
                            }
                        }
                    } else {
                        score = 20; hintMsg = "請將手放在鏡頭前比出飛機";
                        isWavedLock = false;
                        window.airplaneReady = false; // 手離開鏡頭就取消鎖定，防止作弊
                        handXHistory = []; handYHistory = [];
                    }
                }
                else if (currentStep === 2) {
                    // 完美沿用「地方」的向下蓋手勢邏輯
                    if (results.multiHandLandmarks.length >= 1) {
                        const hand = analyzeHandPose(results.multiHandLandmarks[0]);
                        const wrist = hand.landmarks[0];
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        const indexRatio = getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]);
                        const middleRatio = getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]);
                        const ringRatio = getDist(wrist, hand.landmarks[16]) / getDist(wrist, hand.landmarks[13]);
                        const pinkyRatio = getDist(wrist, hand.landmarks[20]) / getDist(wrist, hand.landmarks[17]);

                        const isPlaceShape = (indexRatio > 1.5) && (middleRatio > 1.5) && (ringRatio > 1.5) && (pinkyRatio > 1.5);

                        if (isPlaceShape) {
                            handYHistory.push(hand.centerY);
                            if (handYHistory.length > 20) handYHistory.shift();

                            const minY = Math.min(...handYHistory);
                            
                            if (handYHistory.length > 5 && (hand.centerY - minY > 0.04)) {
                                isWavedLock = true;
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "太完美了！這就是機場的完整手語！";
                            } else {
                                score = 80; hintMsg = "姿勢正確！請將手「往下移動」比出地方";
                            }
                        } else {
                            score = 40; hintMsg = "第二步：請將手心朝下攤平，準備往下蓋";
                            isWavedLock = false;
                        }
                    }
                }
            }
            // ==========================================
            // ⛽ 加油站 (雙步：油槍插入 -> 往下蓋(地方))
            // ==========================================
            else if (name === "加油站") {
                if (currentStep === 1) {
                    if (results.multiHandLandmarks.length === 2) {
                        const hA = analyzeHandPose(results.multiHandLandmarks[0]);
                        const hB = analyzeHandPose(results.multiHandLandmarks[1]);
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        // 辨識上下手
                        const topHand = hA.centerY < hB.centerY ? hA : hB;
                        const botHand = hA.centerY < hB.centerY ? hB : hA;

                        // 計算上方手指比例
                        const wrist = topHand.landmarks[0];
                        const rTop = {
                            idx: getDist(wrist, topHand.landmarks[8]) / getDist(wrist, topHand.landmarks[5]),
                            mid: getDist(wrist, topHand.landmarks[12]) / getDist(wrist, topHand.landmarks[9]),
                            rng: getDist(wrist, topHand.landmarks[16]) / getDist(wrist, topHand.landmarks[13]),
                            pnk: getDist(wrist, topHand.landmarks[20]) / getDist(wrist, topHand.landmarks[17])
                        };

                        // 判斷油槍形狀：食指伸出 (> 1.2)，中、無名、小指收合 (< 1.1)
                        const isPumpShape = (rTop.idx > 1.2) && (rTop.mid < 1.1) && (rTop.rng < 1.1) && (rTop.pnk < 1.1);

                        if (isPumpShape) {
                            // 判斷插入動作：測量「上方手食指尖 (8)」到「下方手掌心 (9)」的距離
                            const pumpTip = topHand.landmarks[8];
                            const tankCenter = botHand.landmarks[9];
                            const distToTank = getDist(pumpTip, tankCenter);
                            
                            // 用陣列記錄距離軌跡
                            handXHistory.push(distToTank);
                            if (handXHistory.length > 20) handXHistory.shift();
                            
                            if (handXHistory.length > 5) {
                                const maxDist = Math.max(...handXHistory);
                                
                                // 曾經有一定距離 (> 0.2)，且現在碰觸到了 (< 0.12)
                                if (maxDist > 0.2 && distToTank < 0.12) {
                                    isWavedLock = true;
                                }
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "第一步加油正確！即將切換...";
                                if (!window.stepTimer) {
                                    window.stepTimer = setTimeout(() => {
                                        updateToStep(2, name);
                                        handXHistory = []; window.stepTimer = null;
                                    }, 1000);
                                }
                            } else {
                                score = 80; hintMsg = "油槍準備就緒！請將食指「往下碰到」下方的拳頭";
                            }
                        } else {
                            score = 40; hintMsg = "第一步：請一手在下握拳，另一手在上比出油槍(伸出食指)";
                            isWavedLock = false; handXHistory = [];
                        }
                    } else {
                        score = 20; hintMsg = "加油動作需要「雙手」配合喔！";
                        isWavedLock = false; handXHistory = [];
                    }
                }
                else if (currentStep === 2) {
                    // 完美沿用「地方」的向下蓋手勢邏輯
                    if (results.multiHandLandmarks.length >= 1) {
                        const hand = analyzeHandPose(results.multiHandLandmarks[0]);
                        const wrist = hand.landmarks[0];
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        const indexRatio = getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]);
                        const middleRatio = getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]);
                        const ringRatio = getDist(wrist, hand.landmarks[16]) / getDist(wrist, hand.landmarks[13]);
                        const pinkyRatio = getDist(wrist, hand.landmarks[20]) / getDist(wrist, hand.landmarks[17]);

                        const isPlaceShape = (indexRatio > 1.5) && (middleRatio > 1.5) && (ringRatio > 1.5) && (pinkyRatio > 1.5);

                        if (isPlaceShape) {
                            handYHistory.push(hand.centerY);
                            if (handYHistory.length > 20) handYHistory.shift();

                            const minY = Math.min(...handYHistory);
                            
                            if (handYHistory.length > 5 && (hand.centerY - minY > 0.04)) {
                                isWavedLock = true;
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "太完美了！這就是加油站的完整手語！";
                            } else {
                                score = 80; hintMsg = "姿勢正確！請將手「往下移動」比出地方";
                            }
                        } else {
                            score = 40; hintMsg = "第二步：請將手心朝下攤平，準備往下蓋";
                            isWavedLock = false;
                        }
                    }
                }
            }

     // ==========================================
            // 🚉 月台 (雙步：掌心滑順畫圈 -> 握粗管子往左右拉開)
            // ==========================================
            else if (name === "月台") {
                if (currentStep === 1) {
                    if (results.multiHandLandmarks.length === 2) {
                        const hA = analyzeHandPose(results.multiHandLandmarks[0]);
                        const hB = analyzeHandPose(results.multiHandLandmarks[1]);
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        const calcRatios = (hand) => {
                            const wrist = hand.landmarks[0];
                            return {
                                idx: getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]),
                                mid: getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]),
                                rng: getDist(wrist, hand.landmarks[16]) / getDist(wrist, hand.landmarks[13]),
                                pnk: getDist(wrist, hand.landmarks[20]) / getDist(wrist, hand.landmarks[17])
                            };
                        };

                        const rA = calcRatios(hA);
                        const rB = calcRatios(hB);

                        const isBrush = (r) => (r.idx > 1.3 && r.mid > 1.3 && r.rng < 1.2 && r.pnk < 1.2);
                        const isCanvas = (r) => (r.idx > 1.3 && r.mid > 1.3 && r.rng > 1.3 && r.pnk > 1.3);

                        let brushHand = null;
                        let canvasHand = null;

                        if (isBrush(rA) && isCanvas(rB)) { brushHand = hA; canvasHand = hB; }
                        else if (isBrush(rB) && isCanvas(rA)) { brushHand = hB; canvasHand = hA; }

                        if (brushHand && canvasHand) {
                            const brushTip = brushHand.landmarks[8];
                            const canvasCenter = canvasHand.landmarks[9];
                            const distToCanvas = getDist(brushTip, canvasCenter);

                            if (distToCanvas < 0.25) {
                                handXHistory.push(brushTip.x);
                                handYHistory.push(brushTip.y);
                                
                                if (handXHistory.length > 30) handXHistory.shift();
                                if (handYHistory.length > 30) handYHistory.shift();
                                
                                if (handXHistory.length > 15) {
                                    const moveX = Math.max(...handXHistory) - Math.min(...handXHistory);
                                    const moveY = Math.max(...handYHistory) - Math.min(...handYHistory);
                                    
                                    // 🎯 門檻降低至 0.05：讓手心畫圈變得更輕鬆滑順
                                    if (moveX > 0.05 && moveY > 0.05) {
                                        isWavedLock = true;
                                    }
                                }

                                if (isWavedLock) {
                                    score = 100; hintMsg = "第一步畫圈正確！即將切換...";
                                    if (!window.stepTimer) {
                                        window.stepTimer = setTimeout(() => {
                                            updateToStep(2, name);
                                            handXHistory = []; handYHistory = []; window.stepTimer = null;
                                        }, 1000);
                                    }
                                } else {
                                    score = 80; hintMsg = "位置正確！請用兩根手指在手心「畫圈圈」";
                                }
                            } else {
                                score = 60; hintMsg = "請把畫筆手(比2) 移到攤平的「手心正上方」";
                                handXHistory = []; handYHistory = []; 
                            }
                        } else {
                            score = 40; hintMsg = "第一步：請一手攤平，另一手比「2」準備畫圈";
                            isWavedLock = false; handXHistory = []; handYHistory = [];
                        }
                    } else {
                        score = 20; hintMsg = "畫圈動作需要「雙手」配合喔！";
                        isWavedLock = false; handXHistory = []; handYHistory = [];
                    }
                }
        // ================= 第二步：握粗管子往左右拉開 =================
                else if (currentStep === 2) {
                    // 初始化鎖定狀態
                    if (typeof window.platformPullReady === 'undefined') window.platformPullReady = false;

                    if (results.multiHandLandmarks.length === 2) {
                        const hA = analyzeHandPose(results.multiHandLandmarks[0]);
                        const hB = analyzeHandPose(results.multiHandLandmarks[1]);
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        // 🎯 專屬形狀判定：完美兼容「鬆拳頭」與「你的透視變形數據」
                        const checkPlatformShape = (hand) => {
                            const wrist = hand.landmarks[0];
                            const idx = getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]);
                            const mid = getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]);
                            const rng = getDist(wrist, hand.landmarks[16]) / getDist(wrist, hand.landmarks[13]);
                            const pnk = getDist(wrist, hand.landmarks[20]) / getDist(wrist, hand.landmarks[17]);
                            
                            // 情況 1：鬆鬆的拳頭 (所有手指比例 < 2.2)
                            const isLooseFist = (idx < 2.2 && mid < 2.2 && rng < 2.2 && pnk < 2.2);
                            
                            // 情況 2：你的專屬視角數據 (因為透視關係，中/無/小指比例飆高到 2.0 ~ 6.0)
                            const isCameraFacing = (mid > 1.8 && rng > 1.8);

                            return isLooseFist || isCameraFacing;
                        };

                        const yDiff = Math.abs(hA.centerY - hB.centerY);
                        const distX = Math.abs(hA.centerX - hB.centerX);

                        // --- 階段一：要求雙手平齊並停頓，進入鎖定 ---
                        if (!window.platformPullReady) {
                            // 確保雙手高度差不多 (yDiff < 0.2)，且形狀符合
                            if (yDiff < 0.2 && checkPlatformShape(hA) && checkPlatformShape(hB)) {
                                handXHistory.push(distX);
                                if (handXHistory.length > 15) handXHistory.shift();
                                
                                if (handXHistory.length > 10) {
                                    const moveDist = Math.max(...handXHistory) - Math.min(...handXHistory);
                                    
                                    // 停頓一下 (距離變化 < 0.03) 即可鎖定！
                                    if (moveDist < 0.03) {
                                        window.platformPullReady = true;
                                        window.platformStartDist = distX; // 記錄起始距離
                                        score = 80; hintMsg = "已鎖定！請將雙手「向左右兩側拉開」";
                                    } else {
                                        score = 60; hintMsg = "請比出「握管子」手勢，放在胸前";
                                    }
                                } else {
                                    score = 60; hintMsg = "請比出「握管子」手勢，放在胸前";
                                }
                            } else {
                                if (yDiff >= 0.2) {
                                    score = 60; hintMsg = "請將雙手放在「差不多高」的位置對齊";
                                } else {
                                    score = 40; hintMsg = "第二步：請雙手比出「握管子」手勢";
                                }
                                handXHistory = [];
                            }
                        } 
                        // --- 階段二：已鎖定，只看拉開距離，無視手指變形 ---
                        else {
                            const currentDist = distX;
                            
                            // 只要現在的距離 比 起始距離 大超過 0.08，就算拉開成功！
                            if (currentDist - window.platformStartDist > 0.08) {
                                isWavedLock = true;
                            }
                            
                            if (isWavedLock) {
                                score = 100; hintMsg = "太完美了！這就是月台的完整手語！";
                            } else {
                                score = 80; hintMsg = "已鎖定！請將雙手「向左右兩側拉開」";
                            }
                        }
                    } else {
                        // 如果手跑出鏡頭，解除鎖定
                        if (!isWavedLock) {
                            window.platformPullReady = false; 
                            handXHistory = [];
                            score = 20; hintMsg = "第二步需要「雙手」都在畫面中配合喔！";
                        }
                    }
                }
            }

// ==========================================
            // 🚄 高鐵 (雙步：抗遮擋鎖定發車 -> 往下蓋(地方))
            // ==========================================
            else if (name === "高鐵") {
                if (currentStep === 1) {
                    // 初始化狀態記憶
                    if (typeof window.trainReady === 'undefined') window.trainReady = false;

                    if (results.multiHandLandmarks.length === 2) {
                        const hA = analyzeHandPose(results.multiHandLandmarks[0]);
                        const hB = analyzeHandPose(results.multiHandLandmarks[1]);
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        const topHand = hA.centerY < hB.centerY ? hA : hB;
                        const botHand = hA.centerY < hB.centerY ? hB : hA;

                        // --- 階段一：鎖定前，檢查大致形狀 (寬鬆抗遮擋) ---
                        if (!window.trainReady) {
                            const calcRatios = (hand) => {
                                const wrist = hand.landmarks[0];
                                return {
                                    idx: getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]),
                                    mid: getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]),
                                    rng: getDist(wrist, hand.landmarks[16]) / getDist(wrist, hand.landmarks[13]),
                                    pnk: getDist(wrist, hand.landmarks[20]) / getDist(wrist, hand.landmarks[17])
                                };
                            };

                            const rBot = calcRatios(botHand);

                            // 🎯 破解手心向下盲區：無名指跟小指數值會暴增，所以「直接無視」！
                            // 只要食指跟中指有伸長 (>1.5) 就當作是軌道。
                            const isTrackShape = (rBot.idx > 1.5 && rBot.mid > 1.5);
                            
                            // 🎯 上方手(高鐵)：放寬指尖距離容錯到 0.15，只要大拇指、食指、中指聚在一起即可
                            const tTip = topHand.landmarks[4];
                            const iTip = topHand.landmarks[8];
                            const mTip = topHand.landmarks[12];
                            const isTrainShape = (getDist(tTip, iTip) < 0.15 && getDist(tTip, mTip) < 0.15);

                            if (isTrackShape && isTrainShape) {
                                window.trainReady = true; // 🎯 鎖定！
                                platformSizeHistory = [topHand.size];
                                handXHistory = [topHand.centerX];
                                score = 80; hintMsg = "高鐵已就緒！請無視變形，直接將列車「往前推」發車";
                            } else {
                                if (!isTrackShape && isTrainShape) {
                                    score = 60; hintMsg = "請將「下方手」比出 2 當作軌道";
                                } else if (isTrackShape && !isTrainShape) {
                                    score = 60; hintMsg = "請將「上方手」五指捏合尖尖的當作列車";
                                } else {
                                    score = 40; hintMsg = "第一步：下方手比 2，上方手捏合尖尖的朝前";
                                }
                            }
                        } 
                        // --- 階段二：已經鎖定，完全無視手指變形，專注追蹤上方手的移動 ---
                        else {
                            platformSizeHistory.push(topHand.size);
                            handXHistory.push(topHand.centerX);
                            
                            if (platformSizeHistory.length > 30) platformSizeHistory.shift();
                            if (handXHistory.length > 30) handXHistory.shift();
                            
                            if (platformSizeHistory.length > 10) {
                                const minSize = Math.min(...platformSizeHistory);
                                const sizeChange = topHand.size - minSize;
                                const moveX = Math.max(...handXHistory) - Math.min(...handXHistory);
                                
                                // 判斷高鐵發車：往前推或是沿著軌道滑動
                                if (sizeChange > 0.015 || moveX > 0.04) {
                                    isWavedLock = true;
                                }
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "第一步高鐵正確！即將切換...";
                                if (!window.stepTimer) {
                                    window.stepTimer = setTimeout(() => {
                                        updateToStep(2, name);
                                        window.trainReady = false; // 切換時重置
                                        platformSizeHistory = []; handXHistory = []; window.stepTimer = null;
                                    }, 1000);
                                }
                            } else {
                                score = 80; hintMsg = "高鐵已就緒！請將上方列車「往前推」發車";
                            }
                        }
                    } else {
                        score = 20; hintMsg = "請將雙手放在畫面中比出高鐵與軌道";
                        isWavedLock = false; 
                        window.trainReady = false; // 斷線立刻重置，防止幽靈軌跡
                        platformSizeHistory = []; handXHistory = [];
                    }
                }
                else if (currentStep === 2) {
                    // 完美沿用「地方」的向下蓋手勢邏輯
                    if (results.multiHandLandmarks.length >= 1) {
                        const hand = analyzeHandPose(results.multiHandLandmarks[0]);
                        const wrist = hand.landmarks[0];
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        const indexRatio = getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]);
                        const middleRatio = getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]);
                        const ringRatio = getDist(wrist, hand.landmarks[16]) / getDist(wrist, hand.landmarks[13]);
                        const pinkyRatio = getDist(wrist, hand.landmarks[20]) / getDist(wrist, hand.landmarks[17]);

                        const isPlaceShape = (indexRatio > 1.5) && (middleRatio > 1.5) && (ringRatio > 1.5) && (pinkyRatio > 1.5);

                        if (isPlaceShape) {
                            handYHistory.push(hand.centerY);
                            if (handYHistory.length > 20) handYHistory.shift();

                            const minY = Math.min(...handYHistory);
                            
                            if (handYHistory.length > 5 && (hand.centerY - minY > 0.04)) {
                                isWavedLock = true;
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "太完美了！這就是高鐵的完整手語！";
                            } else {
                                score = 80; hintMsg = "姿勢正確！請將手「往下移動」比出地方";
                            }
                        } else {
                            score = 40; hintMsg = "第二步：請將手心朝下攤平，準備往下蓋";
                            isWavedLock = false;
                        }
                    }
                }
            }

            // ==========================================
            // 🛃 海關 (三步：飛機斜飛 -> 雙眼檢查(搖晃) -> 往下蓋(地方))
            // ==========================================
            else if (name === "海關") {
                // ================= 第一步：飛機起飛 =================
                if (currentStep === 1) {
                    if (typeof window.customsAirplaneReady === 'undefined') window.customsAirplaneReady = false;

                    if (results.multiHandLandmarks.length >= 1) {
                        const hand = analyzeHandPose(results.multiHandLandmarks[0]);
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

                        if (!window.customsAirplaneReady) {
                            const calcRatios = (h) => {
                                const wrist = h.landmarks[0];
                                return {
                                    idx: getDist(wrist, h.landmarks[8]) / getDist(wrist, h.landmarks[5]),
                                    mid: getDist(wrist, h.landmarks[12]) / getDist(wrist, h.landmarks[9]),
                                    rng: getDist(wrist, h.landmarks[16]) / getDist(wrist, h.landmarks[13]),
                                    pnk: getDist(wrist, h.landmarks[20]) / getDist(wrist, h.landmarks[17])
                                };
                            };
                            const r = calcRatios(hand);

                            // 嚴格飛機形狀：壓下食指與無名指，伸出中指與小指
                            const isAirplaneShape = (r.idx < 1.3) && (r.mid > 1.2) && (r.rng < 1.3) && (r.pnk > 1.2);

                            if (isAirplaneShape) {
                                window.customsAirplaneReady = true; 
                                handXHistory = [hand.centerX]; 
                                handYHistory = [hand.centerY];
                                score = 80; hintMsg = "飛機已鎖定！請轉側面「斜往上滑動」起飛";
                            } else {
                                score = 40; hintMsg = "第一步：請先對著鏡頭比出「飛機」手勢以鎖定";
                                handXHistory = []; handYHistory = [];
                            }
                        } else {
                            // 已經鎖定飛機，開始追蹤軌跡
                            handXHistory.push(hand.centerX);
                            handYHistory.push(hand.centerY);
                            if (handXHistory.length > 30) handXHistory.shift();
                            if (handYHistory.length > 30) handYHistory.shift();

                            const startX = handXHistory[0];
                            const startY = handYHistory[0];
                            const endX = hand.centerX;
                            const endY = hand.centerY;

                            const movedUp = startY - endY;
                            const movedSide = Math.abs(endX - startX);

                            if (movedUp > 0.12 && movedSide > 0.08) {
                                isWavedLock = true;
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "第一步起飛正確！即將切換...";
                                if (!window.stepTimer) {
                                    window.stepTimer = setTimeout(() => {
                                        updateToStep(2, name);
                                        window.customsAirplaneReady = false; 
                                        handXHistory = []; handYHistory = []; window.stepTimer = null;
                                    }, 1000);
                                }
                            } else {
                                score = 80; hintMsg = "飛機已鎖定！請「斜往上滑動」起飛";
                            }
                        }
                    } else {
                        score = 20; hintMsg = "請將手放在鏡頭前比出飛機";
                        isWavedLock = false;
                        window.customsAirplaneReady = false; 
                        handXHistory = []; handYHistory = [];
                    }
                }
                // ================= 第二步：雙眼檢查 (左右搖晃) =================
     else if (currentStep === 2) {
                    if (results.multiHandLandmarks.length >= 1) {
                        const hand = analyzeHandPose(results.multiHandLandmarks[0]);
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        const calcRatios = (h) => {
                            const wrist = h.landmarks[0];
                            return {
                                idx: getDist(wrist, h.landmarks[8]) / getDist(wrist, h.landmarks[5]),
                                mid: getDist(wrist, h.landmarks[12]) / getDist(wrist, h.landmarks[9]),
                                rng: getDist(wrist, h.landmarks[16]) / getDist(wrist, h.landmarks[13]),
                                pnk: getDist(wrist, h.landmarks[20]) / getDist(wrist, h.landmarks[17])
                            };
                        };
                        const r = calcRatios(hand);
                        
                        // 判斷彎彎的「2」: 食指、中指伸出 (>1.2)，無名指、小指收合 (<1.2)
                        const isInspectShape = (r.idx > 1.2 && r.mid > 1.2 && r.rng < 1.2 && r.pnk < 1.2);
                        
                        if (isInspectShape) {
                            // 🎯 拔除停頓要求，直接開始記錄軌跡！
                            handXHistory.push(hand.centerX);
                            if (handXHistory.length > 20) handXHistory.shift();
                            
                            if (handXHistory.length > 5) {
                                const moveX = Math.max(...handXHistory) - Math.min(...handXHistory);
                                
                                // 只要左右搖晃超過 0.05 就算過關
                                if (moveX > 0.05) {
                                    isWavedLock = true;
                                }
                            }
                            
                            if (isWavedLock) {
                                score = 100; hintMsg = "第二步檢查正確！即將切換...";
                                if (!window.stepTimer) {
                                    window.stepTimer = setTimeout(() => {
                                        updateToStep(3, name);
                                        handXHistory = []; window.stepTimer = null;
                                    }, 1000);
                                }
                            } else {
                                score = 80; hintMsg = "檢查已就緒！請在眼睛前「左右搖晃」";
                            }
                        } else {
                            score = 40; hintMsg = "第二步：請比出彎彎的「2」放在眼睛前面";
                            isWavedLock = false;
                            handXHistory = [];
                        }
                    } else {
                        score = 20; hintMsg = "請將手放在鏡頭前比出檢查手勢";
                        isWavedLock = false;
                        handXHistory = [];
                    }
                }
                // ================= 第三步：地方 (往下蓋) =================
                else if (currentStep === 3) {
                    if (results.multiHandLandmarks.length >= 1) {
                        const hand = analyzeHandPose(results.multiHandLandmarks[0]);
                        const wrist = hand.landmarks[0];
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        const indexRatio = getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]);
                        const middleRatio = getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]);
                        const ringRatio = getDist(wrist, hand.landmarks[16]) / getDist(wrist, hand.landmarks[13]);
                        const pinkyRatio = getDist(wrist, hand.landmarks[20]) / getDist(wrist, hand.landmarks[17]);

                        const isPlaceShape = (indexRatio > 1.5) && (middleRatio > 1.5) && (ringRatio > 1.5) && (pinkyRatio > 1.5);

                        if (isPlaceShape) {
                            handYHistory.push(hand.centerY);
                            if (handYHistory.length > 20) handYHistory.shift();

                            const minY = Math.min(...handYHistory);
                            
                            if (handYHistory.length > 5 && (hand.centerY - minY > 0.04)) {
                                isWavedLock = true;
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "太完美了！這就是海關的完整手語！";
                            } else {
                                score = 80; hintMsg = "姿勢正確！請將手「往下移動」比出地方";
                            }
                        } else {
                            score = 40; hintMsg = "第三步：請將手心朝下攤平，準備往下蓋";
                            isWavedLock = false;
                        }
                    } else {
                        score = 20; hintMsg = "請將手放在畫面中比出地方";
                    }
                }
            }
    // ==========================================
            // 🚫 禁止觸摸 (雙步：抗重疊摸手背 -> 禁止手勢)
            // ==========================================
            else if (name === "禁止觸摸") {
                if (currentStep === 1) {
                    // 初始化鎖定狀態
                    if (typeof window.touchReady === 'undefined') window.touchReady = false;

                    const handCount = results.multiHandLandmarks.length;

                    // --- 階段一：雙手靠近鎖定 ---
                    if (!window.touchReady) {
                        if (handCount === 2) {
                            const hA = analyzeHandPose(results.multiHandLandmarks[0]);
                            const hB = analyzeHandPose(results.multiHandLandmarks[1]);
                            
                            // 只要雙手上下靠近 (Y軸距離 < 0.25)，就視為準備觸摸，立刻鎖定！
                            const yDiff = Math.abs(hA.centerY - hB.centerY);
                            if (yDiff < 0.25) {
                                window.touchReady = true;
                                handXHistory = [];
                                score = 80; hintMsg = "已鎖定！請維持重疊並「左右摩擦」(就算少一隻手也沒關係)";
                            } else {
                                score = 60; hintMsg = "請將雙手「上下靠近」準備觸摸";
                            }
                        } else {
                            score = 40; hintMsg = "第一步：請伸出「雙手」手心向下準備";
                            window.touchReady = false;
                        }
                    } 
                    // --- 階段二：無視遮擋，專心抓左右摩擦 ---
                    else {
                        // 已經鎖定了，此時就算 AI 因為重疊只認出一隻手 (handCount >= 1)，我們也照算！
                        if (handCount >= 1) {
                            // 抓取畫面上能看到的位置最高的那隻手 (模擬上方手)
                            let trackHand = analyzeHandPose(results.multiHandLandmarks[0]);
                            if (handCount === 2) {
                                const hB = analyzeHandPose(results.multiHandLandmarks[1]);
                                if (hB.centerY < trackHand.centerY) trackHand = hB;
                            }

                            handXHistory.push(trackHand.centerX);
                            if (handXHistory.length > 20) handXHistory.shift();

                            if (handXHistory.length > 5) {
                                const moveX = Math.max(...handXHistory) - Math.min(...handXHistory);
                                
                                // 偵測左右摩擦動作 (稍微降低門檻到 0.04)
                                if (moveX > 0.04) {
                                    isWavedLock = true;
                                }
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "第一步正確！即將切換...";
                                if (!window.stepTimer) {
                                    window.stepTimer = setTimeout(() => {
                                        updateToStep(2, name);
                                        window.touchReady = false; // 切換時重置
                                        handXHistory = []; window.stepTimer = null;
                                    }, 1000);
                                }
                            } else {
                                score = 80; hintMsg = "已鎖定！請「左右摩擦」手背 (稍微錯開避免完全遮擋)";
                            }
                        } else {
                            // 如果手完全消失 (變成0隻手)，通常是拿離鏡頭了，解除鎖定
                            score = 20; hintMsg = "手部完全消失，請重新將雙手放回鏡頭前";
                            window.touchReady = false;
                            handXHistory = [];
                        }
                    }
                }
                else if (currentStep === 2) {
                    // ==========================================
                    // ✋ 通用「禁止」手勢：手在頭旁往前揮
                    // ==========================================
                    if (results.multiHandLandmarks.length >= 1) {
                        const hand = analyzeHandPose(results.multiHandLandmarks[0]);
                        const wrist = hand.landmarks[0];
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        // 1. 檢查手形：五指並攏 (食指尖到小指尖的距離很近)
                        const fingerSpread = getDist(hand.landmarks[8], hand.landmarks[20]);
                        const isFlatHand = fingerSpread < 0.15;

                        // 2. 檢查位置：必須在頭部附近 (Y < 0.45)
                        const isNearHead = hand.centerY < 0.45;

                        if (isFlatHand && isNearHead) {
                            // 3. 偵測「往前揮動」：Size 會瞬間變大
                            platformSizeHistory.push(hand.size);
                            if (platformSizeHistory.length > 15) platformSizeHistory.shift();

                            if (platformSizeHistory.length > 5) {
                                const minSize = Math.min(...platformSizeHistory);
                                const sizeChange = hand.size - minSize;

                                if (sizeChange > 0.02) {
                                    isWavedLock = true;
                                }
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "太棒了！這就是禁止觸摸的完整手語！";
                            } else {
                                score = 80; hintMsg = "姿勢正確！請將手掌「往前揮動」表示禁止";
                            }
                        } else {
                            // 防呆提示
                            if (!isNearHead && isFlatHand) {
                                score = 60; hintMsg = "請將手「舉高到頭部旁邊」";
                            } else if (!isFlatHand && isNearHead) {
                                score = 60; hintMsg = "請將「五指並攏」";
                            } else {
                                score = 40; hintMsg = "第二步：請將手掌五指並攏，平放頭部旁邊";
                            }
                            isWavedLock = false; platformSizeHistory = [];
                        }
                    } else {
                        score = 20; hintMsg = "請將手放在畫面中比出禁止手勢";
                    }
                }
            }

            // ==========================================
            // 🚫 禁止拍照 (雙步：L型相機按快門 -> 禁止手勢)
            // ==========================================
            else if (name === "禁止拍攝") {
                if (currentStep === 1) {
                    if (results.multiHandLandmarks.length === 2) {
                        const hA = analyzeHandPose(results.multiHandLandmarks[0]);
                        const hB = analyzeHandPose(results.multiHandLandmarks[1]);
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        const calcRatios = (hand) => {
                            const wrist = hand.landmarks[0];
                            return {
                                idx: getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]),
                                mid: getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]),
                                rng: getDist(wrist, hand.landmarks[16]) / getDist(wrist, hand.landmarks[13]),
                                pnk: getDist(wrist, hand.landmarks[20]) / getDist(wrist, hand.landmarks[17])
                            };
                        };

                        const rA = calcRatios(hA);
                        const rB = calcRatios(hB);

                        // 🎯 定義相機形狀：食指伸直 (>1.2)，中、無、小指收合 (<1.1)
                        // (大拇指雖然沒算在比例裡，但人類比這個姿勢時大拇指自然會張開)
                        const isCameraShape = (r) => (r.idx > 1.2 && r.mid < 1.1 && r.rng < 1.1 && r.pnk < 1.1);

                        if (isCameraShape(rA) && isCameraShape(rB)) {
                            
                            // 💡 精準快門偵測：追蹤兩隻手「食指的伸展比例」
                            // 按快門時，食指會微彎，這個比例就會產生波動，可以完美避開手臂上下晃動的干擾
                            handXHistory.push(rA.idx);
                            handYHistory.push(rB.idx);
                            
                            if (handXHistory.length > 20) handXHistory.shift();
                            if (handYHistory.length > 20) handYHistory.shift();

                            if (handXHistory.length > 5) {
                                const moveIdxA = Math.max(...handXHistory) - Math.min(...handXHistory);
                                const moveIdxB = Math.max(...handYHistory) - Math.min(...handYHistory);
                                
                                // 只要其中一隻手的食指有產生超過 0.15 的波動，就算按下快門！
                                if (moveIdxA > 0.15 || moveIdxB > 0.15) {
                                    isWavedLock = true;
                                }
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "喀嚓！第一步正確，即將切換...";
                                if (!window.stepTimer) {
                                    window.stepTimer = setTimeout(() => {
                                        updateToStep(2, name);
                                        handXHistory = []; handYHistory = []; window.stepTimer = null;
                                    }, 1000);
                                }
                            } else {
                                score = 80; hintMsg = "相機就位！請用食指「微動一下」模擬按快門";
                            }
                        } else {
                            score = 40; hintMsg = "第一步：雙手比出 L 型 (收起後三指)，像拿著相機一樣";
                            isWavedLock = false; 
                            handXHistory = []; handYHistory = [];
                        }
                    } else {
                        score = 20; hintMsg = "拿相機需要「雙手」配合喔！";
                        isWavedLock = false;
                        handXHistory = []; handYHistory = [];
                    }
                }
                else if (currentStep === 2) {
                    // ==========================================
                    // ✋ 通用「禁止」手勢：手在頭旁往前揮 (完美沿用)
                    // ==========================================
                    if (results.multiHandLandmarks.length >= 1) {
                        const hand = analyzeHandPose(results.multiHandLandmarks[0]);
                        const wrist = hand.landmarks[0];
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        const fingerSpread = getDist(hand.landmarks[8], hand.landmarks[20]);
                        const isFlatHand = fingerSpread < 0.15;
                        const isNearHead = hand.centerY < 0.45;

                        if (isFlatHand && isNearHead) {
                            platformSizeHistory.push(hand.size);
                            if (platformSizeHistory.length > 15) platformSizeHistory.shift();

                            if (platformSizeHistory.length > 5) {
                                const minSize = Math.min(...platformSizeHistory);
                                const sizeChange = hand.size - minSize;
                                if (sizeChange > 0.02) {
                                    isWavedLock = true;
                                }
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "太完美了！這就是禁止拍照的完整手語！";
                            } else {
                                score = 80; hintMsg = "姿勢正確！請將手掌「往前揮動」表示禁止";
                            }
                        } else {
                            if (!isNearHead && isFlatHand) {
                                score = 60; hintMsg = "請將手「舉高到頭部旁邊」";
                            } else if (!isFlatHand && isNearHead) {
                                score = 60; hintMsg = "請將「五指並攏」";
                            } else {
                                score = 40; hintMsg = "第二步：五指並攏平放頭側，準備往前揮";
                            }
                            isWavedLock = false; platformSizeHistory = [];
                        }
                    }
                }
            }

            // ==========================================
            // 🚬 禁止吸菸 (雙步：比2抽菸 -> 禁止手勢)
            // ==========================================
            else if (name === "禁止吸菸") {
                if (currentStep === 1) {
                    if (results.multiHandLandmarks.length >= 1) {
                        const hand = analyzeHandPose(results.multiHandLandmarks[0]);
                        const wrist = hand.landmarks[0];
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        // 判斷 V 字型 (比 2)：食指、中指伸出，無名指、小指收合
                        const indexRatio = getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]);
                        const middleRatio = getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]);
                        const ringRatio = getDist(wrist, hand.landmarks[16]) / getDist(wrist, hand.landmarks[13]);
                        const pinkyRatio = getDist(wrist, hand.landmarks[20]) / getDist(wrist, hand.landmarks[17]);

                        const isTwoShape = (indexRatio > 1.2 && middleRatio > 1.2 && ringRatio < 1.2 && pinkyRatio < 1.2);

                        if (isTwoShape) {
                            // 必須放在臉部/嘴巴附近
                            if (hand.centerY < 0.5) {
                                // 記錄軌跡，抓取靠近嘴巴的微小動作
                                handYHistory.push(hand.centerY);
                                handXHistory.push(hand.centerX);
                                if (handYHistory.length > 20) handYHistory.shift();
                                if (handXHistory.length > 20) handXHistory.shift();

                                if (handYHistory.length > 5) {
                                    const moveY = Math.max(...handYHistory) - Math.min(...handYHistory);
                                    const moveX = Math.max(...handXHistory) - Math.min(...handXHistory);
                                    
                                    // 只要有微微的位移(點兩下或靠近嘴巴)，就算成功
                                    if (moveY > 0.02 || moveX > 0.02) {
                                        isWavedLock = true;
                                    }
                                }

                                if (isWavedLock) {
                                    score = 100; hintMsg = "第一步抽菸正確！即將切換...";
                                    if (!window.stepTimer) {
                                        window.stepTimer = setTimeout(() => {
                                            updateToStep(2, name);
                                            handYHistory = []; handXHistory = []; window.stepTimer = null;
                                        }, 1000);
                                    }
                                } else {
                                    score = 80; hintMsg = "姿勢正確！請在嘴巴前模擬抽菸";
                                }
                            } else {
                                score = 60; hintMsg = "請把「2」舉高，放到「嘴巴前面」喔！";
                                isWavedLock = false; handYHistory = []; handXHistory = [];
                            }
                        } else {
                            score = 40; hintMsg = "第一步：請單手比出「2」，準備放在嘴巴前面";
                            isWavedLock = false; handYHistory = []; handXHistory = [];
                        }
                    } else {
                        score = 20; hintMsg = "請將手放在畫面中比出抽菸動作";
                        isWavedLock = false; handYHistory = []; handXHistory = [];
                    }
                }
                else if (currentStep === 2) {
                    // ==========================================
                    // ✋ 通用「禁止」手勢：手在頭旁往前揮 (完美沿用)
                    // ==========================================
                    if (results.multiHandLandmarks.length >= 1) {
                        const hand = analyzeHandPose(results.multiHandLandmarks[0]);
                        const wrist = hand.landmarks[0];
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        const fingerSpread = getDist(hand.landmarks[8], hand.landmarks[20]);
                        const isFlatHand = fingerSpread < 0.15;
                        const isNearHead = hand.centerY < 0.45;

                        if (isFlatHand && isNearHead) {
                            platformSizeHistory.push(hand.size);
                            if (platformSizeHistory.length > 15) platformSizeHistory.shift();

                            if (platformSizeHistory.length > 5) {
                                const minSize = Math.min(...platformSizeHistory);
                                const sizeChange = hand.size - minSize;
                                if (sizeChange > 0.02) {
                                    isWavedLock = true;
                                }
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "太完美了！這就是禁止吸菸的完整手語！";
                            } else {
                                score = 80; hintMsg = "姿勢正確！請將手掌「往前揮動」表示禁止";
                            }
                        } else {
                            if (!isNearHead && isFlatHand) {
                                score = 60; hintMsg = "請將手「舉高到頭部旁邊」";
                            } else if (!isFlatHand && isNearHead) {
                                score = 60; hintMsg = "請將「五指並攏」";
                            } else {
                                score = 40; hintMsg = "第二步：五指並攏平放頭側，準備往前揮";
                            }
                            isWavedLock = false; platformSizeHistory = [];
                        }
                    } else {
                        score = 20; hintMsg = "請將手放在畫面中比出禁止手勢";
                    }
                }
            }

            // ==========================================
            // 🍔 禁止飲食 (三步：抓飯吃 -> 拿杯子喝 -> 禁止手勢)
            // ==========================================
            else if (name === "禁止飲食") {
                if (currentStep === 1) {
                    if (results.multiHandLandmarks.length >= 1) {
                        const hand = analyzeHandPose(results.multiHandLandmarks[0]);
                        const wrist = hand.landmarks[0];
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        const indexRatio = getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]);
                        const middleRatio = getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]);
                        
                        // 判斷捏合抓飯：手指延伸(>1.5)，且指尖聚攏捏合 (距離中指關節 < 0.35)
                        const thumbToMiddleMid = getDist(hand.landmarks[4], hand.landmarks[10]) / hand.size;
                        const isEatingShape = (indexRatio > 1.5 && middleRatio > 1.5) && (thumbToMiddleMid < 0.35);

                        if (isEatingShape) {
                            if (hand.centerY < 0.6) {
                                handYHistory.push(hand.centerY);
                                handXHistory.push(hand.centerX);
                                if (handYHistory.length > 20) handYHistory.shift();
                                if (handXHistory.length > 20) handXHistory.shift();

                                if (handYHistory.length > 5) {
                                    const moveY = Math.max(...handYHistory) - Math.min(...handYHistory);
                                    const moveX = Math.max(...handXHistory) - Math.min(...handXHistory);
                                    
                                    // 模擬往嘴巴送的動作
                                    if (moveY > 0.03 || moveX > 0.03) {
                                        isWavedLock = true;
                                    }
                                }

                                if (isWavedLock) {
                                    score = 100; hintMsg = "第一步吃飯正確！即將切換...";
                                    if (!window.stepTimer) {
                                        window.stepTimer = setTimeout(() => {
                                            updateToStep(2, name);
                                            handYHistory = []; handXHistory = []; window.stepTimer = null;
                                        }, 1000);
                                    }
                                } else {
                                    score = 80; hintMsg = "姿勢正確！請在嘴巴前「往內微動」模擬吃東西";
                                }
                            } else {
                                score = 60; hintMsg = "請把手舉高，放到「嘴巴前面」喔！";
                                isWavedLock = false; handYHistory = []; handXHistory = [];
                            }
                        } else {
                            score = 40; hintMsg = "第一步：請將五指指尖「捏合」在一起，像抓食物一樣";
                            isWavedLock = false; handYHistory = []; handXHistory = [];
                        }
                    } else {
                        score = 20; hintMsg = "請將手放在畫面中比出吃飯動作";
                        isWavedLock = false; handYHistory = []; handXHistory = [];
                    }
                }
                else if (currentStep === 2) {
                    if (results.multiHandLandmarks.length >= 1) {
                        const hand = analyzeHandPose(results.multiHandLandmarks[0]);
                        const wrist = hand.landmarks[0];
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        const indexRatio = getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]);
                        const middleRatio = getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]);
                        const thumbToMiddleMid = getDist(hand.landmarks[4], hand.landmarks[10]) / hand.size;

                        // 判斷杯子形狀：食中指微彎(<2.0)，且大拇指打開離開掌心(>0.6)
                        const isCupShape = (indexRatio < 2.0 && middleRatio < 2.3 && thumbToMiddleMid > 0.6);

                        if (isCupShape) {
                            handYHistory.push(hand.centerY);
                            if (handYHistory.length > 20) handYHistory.shift();

                            if (handYHistory.length > 5) {
                                // 判斷往上喝水 (Y座標變小)
                                const movedUp = Math.max(...handYHistory) - hand.centerY;
                                
                                if (movedUp > 0.04 && hand.centerY < 0.65) {
                                    isWavedLock = true;
                                }
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "第二步喝水正確！即將切換...";
                                if (!window.stepTimer) {
                                    window.stepTimer = setTimeout(() => {
                                        updateToStep(3, name);
                                        handYHistory = []; window.stepTimer = null;
                                    }, 1000);
                                }
                            } else {
                                score = 80; hintMsg = "杯子拿好了！請往上移動做出「喝水」的動作";
                            }
                        } else {
                            score = 40; hintMsg = "第二步：請微彎手指比出「拿杯子」的形狀";
                            isWavedLock = false; handYHistory = [];
                        }
                    } else {
                        score = 20; hintMsg = "請將手放在畫面中比出喝水動作";
                        isWavedLock = false; handYHistory = [];
                    }
                }
                else if (currentStep === 3) {
                    // ==========================================
                    // ✋ 通用「禁止」手勢：手在頭旁往前揮
                    // ==========================================
                    if (results.multiHandLandmarks.length >= 1) {
                        const hand = analyzeHandPose(results.multiHandLandmarks[0]);
                        const wrist = hand.landmarks[0];
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        const fingerSpread = getDist(hand.landmarks[8], hand.landmarks[20]);
                        const isFlatHand = fingerSpread < 0.15;
                        const isNearHead = hand.centerY < 0.45;

                        if (isFlatHand && isNearHead) {
                            platformSizeHistory.push(hand.size);
                            if (platformSizeHistory.length > 15) platformSizeHistory.shift();

                            if (platformSizeHistory.length > 5) {
                                const minSize = Math.min(...platformSizeHistory);
                                const sizeChange = hand.size - minSize;
                                if (sizeChange > 0.02) {
                                    isWavedLock = true;
                                }
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "太完美了！這就是禁止飲食的完整手語！";
                            } else {
                                score = 80; hintMsg = "姿勢正確！請將手掌「往前揮動」表示禁止";
                            }
                        } else {
                            if (!isNearHead && isFlatHand) {
                                score = 60; hintMsg = "請將手「舉高到頭部旁邊」";
                            } else if (!isFlatHand && isNearHead) {
                                score = 60; hintMsg = "請將「五指並攏」";
                            } else {
                                score = 40; hintMsg = "第三步：五指並攏平放頭側，準備往前揮";
                            }
                            isWavedLock = false; platformSizeHistory = [];
                        }
                    } else {
                        score = 20; hintMsg = "請將手放在畫面中比出禁止手勢";
                    }
                }
            }
            // ==========================================
            // 🗣️ 禁止交談 (雙步：雙手像嘴巴開合 -> 禁止手勢)
            // ==========================================
            else if (name === "禁止交談") {
                if (currentStep === 1) {
                    if (results.multiHandLandmarks.length === 2) {
                        const hA = analyzeHandPose(results.multiHandLandmarks[0]);
                        const hB = analyzeHandPose(results.multiHandLandmarks[1]);
                        const wristA = hA.landmarks[0];
                        const wristB = hB.landmarks[0];
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        // 計算雙手的食指與中指伸展比例 (需 > 1.3 確保不是握拳)
                        const rA = {
                            idx: getDist(wristA, hA.landmarks[8]) / getDist(wristA, hA.landmarks[5]),
                            mid: getDist(wristA, hA.landmarks[12]) / getDist(wristA, hA.landmarks[9])
                        };
                        const rB = {
                            idx: getDist(wristB, hB.landmarks[8]) / getDist(wristB, hB.landmarks[5]),
                            mid: getDist(wristB, hB.landmarks[12]) / getDist(wristB, hB.landmarks[9])
                        };

                        if (rA.idx > 1.3 && rA.mid > 1.3 && rB.idx > 1.3 && rB.mid > 1.3) {
                            
                            // 💡 抓取核心特徵：大拇指到中指關節的距離 (當作嘴巴的開合度)
                            const mouthA = getDist(hA.landmarks[4], hA.landmarks[10]) / hA.size;
                            const mouthB = getDist(hB.landmarks[4], hB.landmarks[10]) / hB.size;
                            
                            // 取雙手開合度的平均值，並存入歷史軌跡中
                            const avgMouthOpen = (mouthA + mouthB) / 2;
                            handXHistory.push(avgMouthOpen);
                            
                            if (handXHistory.length > 20) handXHistory.shift();

                            if (handXHistory.length > 5) {
                                // 判斷開合動作：找出軌跡中最大與最小的開合度差距
                                const mouthChange = Math.max(...handXHistory) - Math.min(...handXHistory);
                                
                                // 開著的時候大概是 0.6，合起來會小於 0.3。設定 0.15 作為觸發門檻非常穩健！
                                if (mouthChange > 0.15) {
                                    isWavedLock = true;
                                }
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "第一步交談正確！即將切換...";
                                if (!window.stepTimer) {
                                    window.stepTimer = setTimeout(() => {
                                        updateToStep(2, name);
                                        handXHistory = []; window.stepTimer = null;
                                    }, 1000);
                                }
                            } else {
                                score = 80; hintMsg = "準備完成！請將雙手像嘴巴一樣「開合開合」";
                            }
                        } else {
                            score = 40; hintMsg = "第一步：雙手比出鴨子嘴巴的形狀，並放在胸前";
                            isWavedLock = false; handXHistory = [];
                        }
                    } else {
                        score = 20; hintMsg = "交談需要「雙手」一起比喔！";
                        isWavedLock = false; handXHistory = [];
                    }
                }
                else if (currentStep === 2) {
                    // ==========================================
                    // ✋ 通用「禁止」手勢：手在頭旁往前揮
                    // ==========================================
                    if (results.multiHandLandmarks.length >= 1) {
                        const hand = analyzeHandPose(results.multiHandLandmarks[0]);
                        const wrist = hand.landmarks[0];
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        const fingerSpread = getDist(hand.landmarks[8], hand.landmarks[20]);
                        const isFlatHand = fingerSpread < 0.15;
                        const isNearHead = hand.centerY < 0.45;

                        if (isFlatHand && isNearHead) {
                            platformSizeHistory.push(hand.size);
                            if (platformSizeHistory.length > 15) platformSizeHistory.shift();

                            if (platformSizeHistory.length > 5) {
                                const minSize = Math.min(...platformSizeHistory);
                                const sizeChange = hand.size - minSize;
                                if (sizeChange > 0.02) {
                                    isWavedLock = true;
                                }
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "太完美了！這就是禁止交談的完整手語！";
                            } else {
                                score = 80; hintMsg = "姿勢正確！請將手掌「往前揮動」表示禁止";
                            }
                        } else {
                            if (!isNearHead && isFlatHand) {
                                score = 60; hintMsg = "請將手「舉高到頭部旁邊」";
                            } else if (!isFlatHand && isNearHead) {
                                score = 60; hintMsg = "請將「五指並攏」";
                            } else {
                                score = 40; hintMsg = "第二步：五指並攏平放頭側，準備往前揮";
                            }
                            isWavedLock = false; platformSizeHistory = [];
                        }
                    } else {
                        score = 20; hintMsg = "請將手放在畫面中比出禁止手勢";
                    }
                }
            }
            // ==========================================
            // 🚫 禁止進入 (雙步：斜屋頂+大拇指往前推 -> 禁止手勢)
            // ==========================================
            else if (name === "禁止進入") {
                if (currentStep === 1) {
                    if (results.multiHandLandmarks.length === 2) {
                        const hA = analyzeHandPose(results.multiHandLandmarks[0]);
                        const hB = analyzeHandPose(results.multiHandLandmarks[1]);
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        const calcRatios = (hand) => {
                            const wrist = hand.landmarks[0];
                            return {
                                thumb: getDist(wrist, hand.landmarks[4]) / getDist(wrist, hand.landmarks[2]),
                                idx: getDist(wrist, hand.landmarks[8]) / getDist(wrist, hand.landmarks[5]),
                                mid: getDist(wrist, hand.landmarks[12]) / getDist(wrist, hand.landmarks[9]),
                                rng: getDist(wrist, hand.landmarks[16]) / getDist(wrist, hand.landmarks[13]),
                                pnk: getDist(wrist, hand.landmarks[20]) / getDist(wrist, hand.landmarks[17])
                            };
                        };

                        const rA = calcRatios(hA);
                        const rB = calcRatios(hB);

                        // 判斷屋頂手：四指伸直 (>1.4)
                        const isRoof = (r) => (r.idx > 1.4 && r.mid > 1.4 && r.rng > 1.4);
                        // 判斷大拇指手：大拇指伸直(>1.3)，食指與中指收起(<1.2)
                        const isThumb = (r) => (r.thumb > 1.3 && r.idx < 1.2 && r.mid < 1.2);

                        let roofHand = null;
                        let thumbHand = null;

                        // 分辨哪隻手是屋頂，哪隻手是大拇指
                        if (isRoof(rA) && isThumb(rB)) { roofHand = hA; thumbHand = hB; }
                        else if (isRoof(rB) && isThumb(rA)) { roofHand = hB; thumbHand = hA; }

                        if (roofHand && thumbHand) {
                            // 專心追蹤「大拇指手」的大小，往鏡頭推會變大
                            platformSizeHistory.push(thumbHand.size);
                            if (platformSizeHistory.length > 20) platformSizeHistory.shift();

                            if (platformSizeHistory.length > 5) {
                                const minSize = Math.min(...platformSizeHistory);
                                const sizeChange = thumbHand.size - minSize;
                                
                                // 往前移動門檻設定 (0.015 是很舒服的靈敏度)
                                if (sizeChange > 0.015) {
                                    isWavedLock = true;
                                }
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "第一步進入正確！即將切換...";
                                if (!window.stepTimer) {
                                    window.stepTimer = setTimeout(() => {
                                        updateToStep(2, name);
                                        platformSizeHistory = []; window.stepTimer = null;
                                    }, 1000);
                                }
                            } else {
                                score = 80; hintMsg = "姿勢正確！請將「比讚的手」往鏡頭方向「往前推」";
                            }
                        } else {
                            score = 40; hintMsg = "第一步：請一手攤平像斜屋頂，另一手比「讚」";
                            isWavedLock = false; platformSizeHistory = [];
                        }
                    } else {
                        score = 20; hintMsg = "這個動作需要「雙手」一起比喔！";
                        isWavedLock = false; platformSizeHistory = [];
                    }
                }
                else if (currentStep === 2) {
                    // ==========================================
                    // ✋ 通用「禁止」手勢：手在頭旁往前揮
                    // ==========================================
                    if (results.multiHandLandmarks.length >= 1) {
                        const hand = analyzeHandPose(results.multiHandLandmarks[0]);
                        const wrist = hand.landmarks[0];
                        const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        
                        const fingerSpread = getDist(hand.landmarks[8], hand.landmarks[20]);
                        const isFlatHand = fingerSpread < 0.15;
                        const isNearHead = hand.centerY < 0.45;

                        if (isFlatHand && isNearHead) {
                            platformSizeHistory.push(hand.size);
                            if (platformSizeHistory.length > 15) platformSizeHistory.shift();

                            if (platformSizeHistory.length > 5) {
                                const minSize = Math.min(...platformSizeHistory);
                                const sizeChange = hand.size - minSize;
                                if (sizeChange > 0.02) {
                                    isWavedLock = true;
                                }
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "太完美了！這就是禁止進入的完整手語！";
                            } else {
                                score = 80; hintMsg = "姿勢正確！請將手掌「往前揮動」表示禁止";
                            }
                        } else {
                            if (!isNearHead && isFlatHand) {
                                score = 60; hintMsg = "請將手「舉高到頭部旁邊」";
                            } else if (!isFlatHand && isNearHead) {
                                score = 60; hintMsg = "請將「五指並攏」";
                            } else {
                                score = 40; hintMsg = "第二步：五指並攏平放頭側，準備往前揮";
                            }
                            isWavedLock = false; platformSizeHistory = [];
                        }
                    } else {
                        score = 20; hintMsg = "請將手放在畫面中比出禁止手勢";
                    }
                }
            }
            // ==========================================
            // 👨 男廁 與 👩 女廁
            // ==========================================
            else if (name === "男廁" || name === "女廁") {
                if (currentStep === 1) {
                    handXHistory = [];
                    if (hand.isWCShape) {
                        score = 100; hintMsg = "第一步「WC」正確！即將切換影片...";
                        if (!window.stepTimer) {
                            window.stepTimer = setTimeout(() => { updateToStep(2, name); window.stepTimer = null; }, 1000);
                        }
                    } else {
                        score = 40; hintMsg = "請比出「WC」（中、無、小指伸直）";
                        clearTimeout(window.stepTimer); window.stepTimer = null;
                    }
                }
                else if (currentStep === 2) {
                    const isCorrectShape = (name === "男廁") ? hand.isThumbUp : hand.isPinkyUp;
                    const fingerName = (name === "男廁") ? "大拇指" : "小拇指";

                    if (isCorrectShape) {
                        const tipIndex = (name === "男廁") ? 4 : 20;
                        handXHistory.push(hand.landmarks[tipIndex].x);
                        if (handXHistory.length > 15) handXHistory.shift();
                        if (handXHistory.length > 5 && (Math.max(...handXHistory) - Math.min(...handXHistory)) > 0.03) {
                            isWavedLock = true;
                        }

                        if (isWavedLock) { score = 100; hintMsg = `太完美了！這就是${name}的手語！`; }
                        else { score = 80; hintMsg = `手勢對了！請左右搖晃你的${fingerName}`; }
                    } else {
                        isWavedLock = false; handXHistory = [];
                        score = 40; hintMsg = `第二步：請伸出${fingerName}並左右搖晃`;
                    }
                }
            }
            // ==========================================
            // 🛜 無線網路 (雙手 + 搖晃)
            // ==========================================
            else if (name === "無線網路") {
                if (results.multiHandLandmarks.length === 2) {
                    const hA = analyzeHandPose(results.multiHandLandmarks[0]);
                    const hB = analyzeHandPose(results.multiHandLandmarks[1]);

                    let topHand = hA.centerY < hB.centerY ? hA : hB;
                    let bottomHand = hA.centerY < hB.centerY ? hB : hA;

                    if (topHand.isThreeShape && bottomHand.isOneShape) {
                        const isAbove = topHand.centerY < bottomHand.centerY;
                        const isClose = Math.abs(topHand.centerX - bottomHand.centerX) < 0.3;

                        if (isAbove && isClose) {
                            handXHistory.push(topHand.landmarks[12].x);
                            if (handXHistory.length > 15) handXHistory.shift();
                            if (handXHistory.length > 5 && (Math.max(...handXHistory) - Math.min(...handXHistory)) > 0.04) {
                                isWavedLock = true;
                            }

                            if (isWavedLock) {
                                score = 100; hintMsg = "太完美了！這就是無線網路的手語！";
                            } else {
                                score = 80; hintMsg = "位置正確！請以手心為軸，將「3」左右搖晃";
                            }
                        } else {
                            score = 60; hintMsg = "快對了！請把「1」放在「3」的正下方";
                            handXHistory = []; isWavedLock = false;
                        }
                    } else {
                        score = 40; hintMsg = "請一手比「3」在上方，另一手比「1」在下方";
                        handXHistory = []; isWavedLock = false;
                    }
                } else {
                    score = 20; hintMsg = "需要雙手喔！上方比「3」，下方比「1」";
                    handXHistory = []; isWavedLock = false;
                }
            }
            // ==========================================
            // 🚻 廁所
            // ==========================================
            else if (name === "廁所") {
                if (hand.isWCShape) {
                    score = 100; hintMsg = "太完美了！這就是廁所的手語！";
                } else {
                    score = 40; hintMsg = "請比出「WC」（中、無、小指伸直）";
                }
            }
            // ==========================================
            // 📞 公共電話
            // ==========================================
            else if (name === "公共電話") {
                if (hand.isPhoneShape) {
                    score = (hand.centerY < 0.6) ? 100 : 80;
                    hintMsg = (score === 100) ? "太完美了！這就是公共電話！" : "手勢對了！請把手舉到耳朵旁";
                }
                else { score = 40; hintMsg = "請比出「6」（大拇指與小拇指伸直）"; }
            }
            // ==========================================
            // 🚶‍♂️ 樓梯、電梯、手扶梯
            // ==========================================
            else if (name === "樓梯" || name === "電梯" || name === "手扶梯" || name === "電扶梯") {
                if (results.multiHandLandmarks.length === 2) {
                    const hA = analyzeHandPose(results.multiHandLandmarks[0]);
                    const hB = analyzeHandPose(results.multiHandLandmarks[1]);
                    let legs = hA.centerY < hB.centerY ? hA : hB;
                    let plat = hA.centerY < hB.centerY ? hB : hA;

                    if (legs.isLegs && plat.isPlatform) {
                        const isTouch = ((legs.landmarks[8].y + legs.landmarks[12].y) / 2) >= plat.centerY - 0.15;

                        if (isTouch) {
                            platformYHistory.push(plat.centerY);
                            platformSizeHistory.push(plat.size);
                            if (platformYHistory.length > 20) platformYHistory.shift();
                            if (platformSizeHistory.length > 20) platformSizeHistory.shift();

                            const movedUp = (platformYHistory[0] - plat.centerY) > 0.04;
                            const movedForward = (plat.size - platformSizeHistory[0]) > 0.015;

                            if (name === "樓梯") {
                                score = 100; hintMsg = "太完美了！請保持姿勢往前走！";
                            } else if (name === "電梯") {
                                if (movedUp) { score = 100; hintMsg = "太完美了！電梯往上了！"; }
                                else { score = 80; hintMsg = "姿勢正確！現在請將雙手一起「往上」移動"; }
                            } else if (name === "手扶梯" || name === "電扶梯") {
                                if (movedForward) { score = 100; hintMsg = "太完美了！手扶梯往前了！"; }
                                else { score = 80; hintMsg = "姿勢正確！現在請將雙手一起「往鏡頭方向」移動"; }
                            }
                        } else {
                            score = 80; hintMsg = "快對了！把指尖往下碰到平台上喔！";
                            platformYHistory = []; platformSizeHistory = [];
                        }
                    } else {
                        score = 40; hintMsg = "請一手平放，另一手比「2」朝下";
                        platformYHistory = []; platformSizeHistory = [];
                    }
                } else {
                    score = 20; hintMsg = "需要雙手喔！一手平放，一手比 2";
                }
            }
            else {
                hintMsg = `正在練習：${name}，AI 學習中...`;
                score = results.multiHandLandmarks.length * 30;
            }
        } else {
            score = 0; hintMsg = "請將手放到畫面中";

            clearTimeout(window.stepTimer); window.stepTimer = null;
            handXHistory = []; handYHistory = []; handGatherHistory = [];
            isWavedLock = false;
            platformYHistory = []; platformSizeHistory = [];

            // 🎯 刪除原本的 if (currentStep !== 1) updateToStep(1, name);
            // 讓手放下來時步驟不重置，接續練習！
            
            if (webcamDimOverlay) webcamDimOverlay.classList.remove('hidden');
        }

        if (accuracyBar && accuracyText && teachInstruction) {
            accuracyBar.style.width = `${score}%`;
            accuracyText.innerText = `${score}%`;
            teachInstruction.innerText = hintMsg;
            teachInstruction.style.color = (score === 100) ? "#00B4FF" : "#4A4A4A";

            // 🎯 新增：自動切換下一個圖標邏輯
            // 🎯 新增：自動切換下一個圖標邏輯
            const totalStepsForIcon = SIGN_STEPS[name] || 1;
            
            if (score === 100 && currentStep === totalStepsForIcon) {
                isTransitioningIcon = true; // 鎖定狀態
                teachInstruction.innerText = hintMsg + " (即將進入下一個圖標...)";
                
                setTimeout(() => {
                    // 🎯 關鍵修復：把 innerText 改成 textContent，才能抓到隱藏選單裡的字！
                    const allIcons = Array.from(document.querySelectorAll('.icon-name')).map(el => el.textContent.trim());
                    const currentIndex = allIcons.indexOf(name);
                    
                    if (currentIndex !== -1 && currentIndex < allIcons.length - 1) {
                        // 抓取下一個圖標
                        const nextIcon = allIcons[currentIndex + 1];
                        
                        // 替換畫面上的標題與圖片
                        if (teachTitle) teachTitle.innerText = nextIcon;
                        const descImg = document.querySelector('.teach-desc-img');
                        if (descImg) descImg.src = `teach/${nextIcon}_圖標說明.png`;
                        
                        // 清空所有歷史軌跡
                        clearTimeout(window.stepTimer); window.stepTimer = null;
                        platformYHistory = []; platformSizeHistory = []; 
                        handXHistory = []; handYHistory = []; handGatherHistory = [];
                        
                        // 🎯 新增防呆：重置所有特殊圖標的狀態，避免連續練習時卡死
                        window.schoolRoofDone = false; window.airplaneReady = false; 
                        window.trainReady = false; window.customsAirplaneReady = false; 
                        window.inspectReady = false; window.touchReady = false;
                        
                        // 進入下一個圖標的第 1 步
                        updateToStep(1, nextIcon);
                        updateVideoLayers();
                    } else {
                        teachInstruction.innerText = "太棒了！所有圖標都練習完了！";
                    }
                    isTransitioningIcon = false; // 解除鎖定
                }, 2000); 
            }
        }
    }

    function syncVideos() { [videoBoth, videoIcon, videoHand].forEach(v => { if(v){ v.currentTime = 0; v.play().catch(()=>{}); } }); }
    function updateVideoLayers() {
        [videoBoth, videoIcon, videoHand].forEach(v => v?.classList.remove('show'));
        if (isIconActive && isHandActive) videoBoth?.classList.add('show');
        else if (isIconActive) videoIcon?.classList.add('show');
        else if (isHandActive) videoHand?.classList.add('show');
    }

    let isIconActive = true; let isHandActive = true;
    updateVideoLayers();

    document.getElementById('toggle-icon-btn')?.addEventListener('click', function() {
        isIconActive = !isIconActive;
        this.querySelector('img').src = isIconActive ? "PNG/圖標按鈕_藍.png" : "PNG/圖標按鈕_白.png";
        updateVideoLayers();
    });

    document.getElementById('toggle-hand-btn')?.addEventListener('click', function() {
        isHandActive = !isHandActive;
        this.querySelector('img').src = isHandActive ? "PNG/手勢按鈕_藍.png" : "PNG/手勢按鈕_白.png";
        updateVideoLayers();
    });
document.querySelectorAll('.icon-item').forEach(item => {
        item.addEventListener('click', () => {
            // 使用者手動點擊時，強制解除切換鎖定
            isTransitioningIcon = false; 

            // 🎯 這裡也一併改成 textContent
            const name = item.querySelector('.icon-name').textContent.trim();
            if (teachTitle) teachTitle.innerText = name;
            const descImg = document.querySelector('.teach-desc-img');
            if (descImg) descImg.src = `teach/${name}_圖標說明.png`;

            // 清空所有歷史軌跡與特殊鎖定狀態
            clearTimeout(window.stepTimer); window.stepTimer = null;
            platformYHistory = []; platformSizeHistory = []; 
            handXHistory = []; handYHistory = []; handGatherHistory = [];
            window.schoolRoofDone = false; window.airplaneReady = false; 
            window.trainReady = false; window.customsAirplaneReady = false; 
            window.inspectReady = false; window.touchReady = false;
            
            updateToStep(1, name);

            updateVideoLayers();
            document.getElementById('icon-select-modal').classList.remove('show');
        });
    });

    const iconMenuBtn = document.getElementById('icon-menu-btn');
    iconMenuBtn?.addEventListener('click', (e) => { e.stopPropagation(); document.getElementById('icon-select-modal').classList.toggle('show'); });
    document.addEventListener('click', (e) => { if (!document.getElementById('icon-select-modal')?.contains(e.target) && e.target !== iconMenuBtn) document.getElementById('icon-select-modal')?.classList.remove('show'); });

    const modalScrollContainer = document.getElementById('icon-select-modal')?.querySelector('.modal-scroll-container');
    const modalDragOverlay = document.getElementById('modal-drag-overlay');
    if (modalScrollContainer) {
        let isDown = false; let startX, scrollLeft;
        modalScrollContainer.addEventListener('mousedown', (e) => { isDown = true; startX = e.pageX - modalScrollContainer.offsetLeft; scrollLeft = modalScrollContainer.scrollLeft; if(modalDragOverlay) {modalDragOverlay.style.opacity = '0';}});
        modalScrollContainer.addEventListener('mouseleave', () => isDown = false);
        modalScrollContainer.addEventListener('mouseup', () => isDown = false);
        modalScrollContainer.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - modalScrollContainer.offsetLeft;
            modalScrollContainer.scrollLeft = scrollLeft - (x - startX) * 1.5;
        });
    }
    // ==========================================
    // 🎯 紅色掛斷按鈕：沉浸式轉場回首頁
    // ==========================================
    const endCallBtn = document.querySelector('.end-call-btn');
    if (endCallBtn) {
        endCallBtn.onclick = null; // 清除 HTML 上原本寫死的 onclick 跳轉
        
        endCallBtn.addEventListener('click', function(e) {
            e.preventDefault();

            // 1. 建立轉場圓形
            let circle = document.getElementById('transition-circle');
            if (!circle) {
                circle = document.createElement('div');
                circle.id = 'transition-circle';
                circle.className = 'transition-circle';
                document.body.appendChild(circle);
            }

            // 2. 從滑鼠點擊處擴張
            const x = e.clientX;
            const y = e.clientY;
            circle.style.left = `${x}px`;
            circle.style.top = `${y}px`;
            void circle.offsetWidth; 
            circle.classList.add('active');

            // 3. 等待動畫 0.7 秒後回到首頁的圖標總覽區塊
           setTimeout(() => {
            window.location.href = 'index.html#icon-overview-section';
        }, 700);
        });
    }
});