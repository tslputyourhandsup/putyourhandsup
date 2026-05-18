// ==========================================
// 1. 網頁跳轉邏輯
// ==========================================
const startBtn = document.getElementById('startBtn');
if (startBtn) {
    startBtn.addEventListener('click', function() {
        window.location.href = 'intro.html';
    });
}

const nextBtn = document.getElementById('nextBtn');
if (nextBtn) {
    nextBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const infoOverlay = document.getElementById('infoOverlay');
        if (infoOverlay) {
            infoOverlay.style.display = 'flex';
        }
    });
}

// ==========================================
// 2. 多段式打字機效果 (talk.html)
// ==========================================
const textElement = document.getElementById('typewriterText');
const dialogues = [
    "：你好！你手上的氛圍有點特別耶！",
    "：這裡的人，名字可不是用講的，而是用「手」取的",
    "：他們觀察你的習慣或氣場，幫你取一個屬於你的「手語名字」"
];
const typingSpeed = 100; 
let currentDialogIndex = 0; 
let charIndex = 0; 
let isTyping = false; 

function typeWriter() {
    if (textElement && currentDialogIndex < dialogues.length) {
        const currentText = dialogues[currentDialogIndex];
        if (charIndex < currentText.length) {
            isTyping = true; 
            textElement.textContent += currentText.charAt(charIndex);
            charIndex++;
            setTimeout(typeWriter, typingSpeed);
        } else {
            isTyping = false; 
        }
    }
}

// ==========================================
// 3. 點擊對話框切換邏輯 & 顯示基本資料卡
// ==========================================
const dialogBox = document.querySelector('.dialog-box');
const infoOverlay = document.getElementById('infoOverlay');

if (dialogBox && !document.getElementById('interludeDialogBox')) {
    dialogBox.addEventListener('click', function() {
        if (infoOverlay && infoOverlay.style.display === 'flex') return;
        if (isTyping) return;

        currentDialogIndex++;
        if (currentDialogIndex < dialogues.length) {
            textElement.textContent = "";
            charIndex = 0;
            typeWriter();
        } else {
            if (infoOverlay) infoOverlay.style.display = 'flex';
        }
    });
}

// ==========================================
// 4. 基本資料邏輯與本地資料庫
// ==========================================
const genderBtns = document.querySelectorAll('.gender-btn');
let selectedGender = '';

genderBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        genderBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        selectedGender = this.getAttribute('data-gender');
    });
});

const gogoBtn = document.getElementById('gogoBtn');
if (gogoBtn) {
    gogoBtn.addEventListener('click', function() {
        const userName = document.getElementById('userNameInput').value.trim();
        if (userName === '') { alert('請輸入你的名字喔！'); return; }
        if (selectedGender === '') { alert('請選擇你的生理性別喔！'); return; }

        localStorage.setItem('user_name', userName);
        localStorage.setItem('user_gender', selectedGender);
        window.location.href = 'question.html';
    });
}

window.addEventListener('load', function() {
    if (textElement && !document.getElementById('interludeDialogBox')) {
        typeWriter();
    }
});

// ==========================================
// 5. 心理測驗資料庫 (DB)
// ==========================================
const DB = {
    stage1: [
      { bg: 'JPG/第一輪_Q1.jpg', lead: '你走進一家手套店，不禁開始想...', q: '「如果我的手有意識，他最想穿上什麼？」', opts: [ {t:'小背包和登山帽，隨時去探險', k:'extravert'}, {t:'軟綿綿的毛衣，像雲朵包覆手指', k:'introvert'}, {t:'俐落的皮衣外套，帥氣登場', k:'decisive'} ] },
      { bg: 'JPG/第一輪_Q2.jpg', lead: '一個路人走過來問你...', q: '「你的耳機裡聽的是什麼音樂？」', opts: [ {t:'風格獨特的獨立音樂', k:'analytic'}, {t:'經典不敗的懷舊金曲', k:'caring'}, {t:'時下最流行的K-POP', k:'extravert'} ] },
      { bg: 'JPG/第一輪_Q3.jpg', lead: '看到前方有一個人慌亂的比著手語...', q: '「似乎沒有人懂他，這時你會？」', opts: [ {t:'怕幫不上忙，默默走開', k:'introvert'}, {t:'在「動字動字」學到的手語能派上用場了！', k:'decisive'}, {t:'拿出手機打字，幫他傳遞訊息', k:'analytic'} ] },
      { bg: 'JPG/第一輪_Q4.jpg', lead: '來到一家餐廳，排了很久終於輪到你時...', q: '「想點的剛好賣完了，你心想？」', opts: [ {t:'好可惜！那試試別的吧', k:'caring'}, {t:'真掃興～想去別家店買了', k:'extravert'}, {t:'後面好多人...好尷尬...隨便點一個', k:'introvert'} ] },
      { bg: 'JPG/第一輪_Q5.jpg', lead: '吃飽準備離開時，出口突然變成三道門了...', q: '「憑感覺選出你想推開的那一道門吧！」', opts: [ {t:'直覺告訴我，冒險的路在A門！', k:'decisive'}, {t:'仔細觀察符號， B門最吸引我', k:'analytic'}, {t:'Ｃ門看起來最安全，應該不會錯', k:'caring'} ] }
    ],
  interludes: {
      extravert: { bg: 'JPG/外向活力_Q0.jpg', btn: '開始派對' },
      introvert: { bg: 'JPG/內向安靜_Q0.jpg', btn: '前往花園' },
      caring:    { bg: 'JPG/關懷溫暖_Q0.jpg', btn: '前往檔案室' },
      decisive:  { bg: 'JPG/果斷堅強_Q0.jpg', btn: '前往冒險遊戲' },
      analytic:  { bg: 'JPG/敏銳理性_Q0.jpg', btn: '前往工作室' }
    },
    stage2: {
      extravert: [
        {bg:'JPG/外向活力_Q1.jpg', lead:'當視線恢復，眼前是一個盛大的派對，你推開門，耀眼的光線閃了你一下', q:'一顆迪斯可球從天而降\n「所有人都慌成一團，你的反應是？」', opts:[{t:'把它踢回空中，派對不能停 ！',k:'playful'}, {t:'開玩笑地說「這是我的見面禮嗎？」',k:'humorous'}, {t:'檢查現場有沒有人受傷',k:'lively'}]},
        {bg:'JPG/外向活力_Q2.jpg', lead:'當視線恢復，眼前是一個盛大的派對，你推開門，耀眼的光線閃了你一下', q:'派對恢復秩序，調酒師問你\n「要來一杯嗎？」', opts:[{t:'今天全場我請客 ！',k:'generous'}, {t:'來一杯最酷的限定特調！',k:'playful'}, {t:'給我十杯，今晚不醉不歸！',k:'humorous'}]},
        {bg:'JPG/外向活力_Q3.jpg', lead:'當視線恢復，眼前是一個盛大的派對，你推開門，耀眼的光線閃了你一下', q:'派對來到高潮，每個人要來到台前 solo \n「你想做出什麼表演？」', opts:[{t:'模仿短影片舞蹈',k:'lively'}, {t:'選一首名曲邀請大家跟著唱',k:'generous'}, {t:'講一個廢到笑的冷笑話',k:'playful'}]},
        {bg:'JPG/外向活力_Q4.jpg', lead:'當視線恢復，眼前是一個盛大的派對，你推開門，耀眼的光線閃了你一下', q:'到了尾聲，音樂和燈光逐漸柔和\n「在不打擾氣氛的情況下，你想怎麼做？」', opts:[{t:'偷偷到點心區吃東西',k:'humorous'}, {t:'發一篇限時動態記錄',k:'lively'}, {t:'隨著音樂搖擺，放鬆心情',k:'generous'}]},
        {bg:'JPG/外向活力_Q5.jpg', lead:'當視線恢復，眼前是一個盛大的派對，你推開門，耀眼的光線閃了你一下', q:'派對結束，精彩的一整天\n「今天哪個部分讓你印象最深刻？」', opts:[{t:'迪斯可球掉下的那刻',k:'playful'}, {t:'表演時間大家的演出',k:'humorous'}, {t:'認識了很多的新朋友',k:'lively'}]}
      ],
      introvert: [
        {bg:'JPG/內向安靜_Q1.jpg', lead:'當視線恢復，眼前是一個寧靜的花園，你推開門，耀眼的光線閃了你一下。', q:'剛踏入花園，畫面美不勝收\n「你會怎麼形容當下的心情？」', opts:[{t:'舒服到想要直接躺下來',k:'calm'}, {t:'像畫一樣，好想收藏起來',k:'gentle'}, {t:'屬於我的秘境，不想被發現',k:'steady'}]},
        {bg:'JPG/內向安靜_Q2.jpg', lead:'當視線恢復，眼前是一個寧靜的花園，你推開門，耀眼的光線閃了你一下。', q:'此時一位熱心的人走向前...\n「需要為你導覽周圍嗎?」', opts:[{t:'「我自己看就好，謝謝」',k:'shy'}, {t:'「你是這邊的工作人員嗎？」',k:'calm'}, {t:'「好啊，那就麻煩你了～」',k:'gentle'}]},
        {bg:'JPG/內向安靜_Q3.jpg', lead:'當視線恢復，眼前是一個寧靜的花園，你推開門，耀眼的光線閃了你一下。', q:'發現一株從未見過的奇異植物\n「你會怎麼做？」', opts:[{t:'可能有毒，還是不要靠近比較好',k:'steady'}, {t:'拍照上傳限時動態',k:'shy'}, {t:'仔細觀察他的外型',k:'calm'}]},
        {bg:'JPG/內向安靜_Q4.jpg', lead:'當視線恢復，眼前是一個寧靜的花園，你推開門，耀眼的光線閃了你一下。', q:'你開始覺得走到有點累了，\n「你想怎麼休息?」', opts:[{t:'戴起耳機享受片刻安靜',k:'gentle'}, {t:'吃塊餅乾充電，繼續上路',k:'steady'}, {t:'再忍耐一下，回家就可以好好休息',k:'shy'}]},
        {bg:'JPG/內向安靜_Q5.jpg', lead:'當視線恢復，眼前是一個寧靜的花園，你推開門，耀眼的光線閃了你一下。', q:'休息完後準備離開\n「你想用什麼方式紀錄這天？」', opts:[{t:'默默記在心裡，享受當下',k:'calm'}, {t:'發一篇社群貼文',k:'gentle'}, {t:'回去和朋友口頭分享',k:'steady'}]}
      ],
      caring: [
        {bg:'JPG/關懷溫暖_Q1.jpg', lead:'你推開門，耀眼的光線閃了你一下，當視線恢復，眼前是一個巨大的檔案室', q:'剛踏入這個地方，四周的光點慢慢漂浮起來...\n「你會怎麼反應？」', opts:[{t:'伸手輕輕碰觸，想知道它們的觸感',k:'soft'}, {t:'靜靜被光包圍，心情都好了',k:'kind'}, {t:'忍不住動手整理，恢復秩序',k:'patient'}]},
        {bg:'JPG/關懷溫暖_Q2.jpg', lead:'你推開門，耀眼的光線閃了你一下，當視線恢復，眼前是一個巨大的檔案室', q:'有個光點突然變得異常灰暗，看起來很低落...\n「你會怎麼處理它的心情？」', opts:[{t:'問它發生什麼事了',k:'upbeat'}, {t:'給他一點時間自己冷靜下來',k:'soft'}, {t:'做個鬼臉逗它開心',k:'kind'}]},
        {bg:'JPG/關懷溫暖_Q3.jpg', lead:'你推開門，耀眼的光線閃了你一下，當視線恢復，眼前是一個巨大的檔案室', q:'一個人不小心把光點撞得滿天飛...\n「你會怎麼解決這個混亂？」', opts:[{t:'安慰並請他收拾乾淨',k:'patient'}, {t:'邊笑邊說「這樣其實也很漂亮」',k:'upbeat'}, {t:'默默地幫忙撿回原位',k:'soft'}]},
        {bg:'JPG/關懷溫暖_Q4.jpg', lead:'你推開門，耀眼的光線閃了你一下，當視線恢復，眼前是一個巨大的檔案室', q:'一顆特別亮的光點飄到你手中\n「你覺得它要說什麼？」', opts:[{t:'感人的溫馨故事',k:'kind'}, {t:'尚未完成的夢想',k:'patient'}, {t:'克服困難的方法',k:'upbeat'}]},
        {bg:'JPG/關懷溫暖_Q5.jpg', lead:'你推開門，耀眼的光線閃了你一下，當視線恢復，眼前是一個巨大的檔案室', q:'逛完檔案室後，開始回想...\n「你對哪顆光點印象最深刻？」', opts:[{t:'平平無奇，很安靜的那顆',k:'soft'}, {t:'一閃一閃，像在笑的那顆',k:'kind'}, {t:'顏色最溫暖，讓人覺得安心的那顆',k:'patient'}]}
      ],
      decisive: [
        {bg:'JPG/果斷堅強_Q1.jpg', lead:'你推開門，耀眼的光線閃了你一下，當視線恢復，眼前是一個冒險遊戲場景', q:'一進來，眼前出現三條道路...\n「你會選擇哪一條路？」', opts:[{t:'選最危險的那條，我天生喜歡冒險',k:'brave'}, {t:'不聽別人建議，選順眼的那條',k:'confident'}, {t:'快速分析勝算，決定就不回頭',k:'decisive'}]},
        {bg:'JPG/果斷堅強_Q2.jpg', lead:'你推開門，耀眼的光線閃了你一下，當視線恢復，眼前是一個冒險遊戲場景', q:'突然出現一個充滿謎題的門。\n「你會怎麼解決它？」', opts:[{t:'另找道路，也許有其他出口',k:'independent'}, {t:'有點沒把握，先慢慢觀察',k:'brave'}, {t:'沒什麼難得倒我的，直接破解',k:'confident'}]},
        {bg:'JPG/果斷堅強_Q3.jpg', lead:'你推開門，耀眼的光線閃了你一下，當視線恢復，眼前是一個冒險遊戲場景', q:'遇到一位卡關的玩家求助，想要請你幫忙...\n「這時你會怎麼幫助他？」', opts:[{t:'可能是陷阱，無視他',k:'decisive'}, {t:'引導他怎麼開，然後走回自己的路',k:'independent'}, {t:'別人有需要，二話不說直接幫忙',k:'brave'}]},
        {bg:'JPG/果斷堅強_Q4.jpg', lead:'你推開門，耀眼的光線閃了你一下，當視線恢復，眼前是一個冒險遊戲場景', q:'出現一個會說話的寶箱，它說只有回答正確的人能打開...\n「你覺得它想聽什麼？」', opts:[{t:'「我就是鑰匙」',k:'confident'}, {t:'「我會靠自己的力量打開你」',k:'decisive'}, {t:'「我不需要寶藏，我只需要勝利」',k:'independent'}]},
        {bg:'JPG/果斷堅強_Q5.jpg', lead:'你推開門，耀眼的光線閃了你一下，當視線恢復，眼前是一個冒險遊戲場景', q:'遊戲結束，玩家獲得徽章作為獎勵...\n「你會選擇哪一枚徽章？」', opts:[{t:'最亮的那顆，無所畏懼',k:'brave'}, {t:'最大的那顆，胸有成竹',k:'confident'}, {t:'最硬的那顆，意志堅強',k:'decisive'}]}
      ],
      analytic: [
        {bg:'JPG/敏銳理性_Q1.jpg', lead:'你推開門，耀眼的光線閃了你一下，當視線恢復，眼前是一個忙碌的工作室', q:'到了工作崗位，一切都很新鮮。\n「你會先觀察什麼？」', opts:[{t:'其他人的工作模式',k:'sharp'}, {t:'桌上散落的零件和工具',k:'careful'}, {t:'工作室的格局和動線',k:'smart'}]},
        {bg:'JPG/敏銳理性_Q2.jpg', lead:'你推開門，耀眼的光線閃了你一下，當視線恢復，眼前是一個忙碌的工作室', q:'小組開始分配任務，\n「你會擔任什麼樣的角色？」', opts:[{t:'安排事項，規劃時程',k:'cautious'}, {t:'提出創新的點子',k:'sharp'}, {t:'負責溝通，激勵團隊',k:'careful'}]},
        {bg:'JPG/敏銳理性_Q3.jpg', lead:'你推開門，耀眼的光線閃了你一下，當視線恢復，眼前是一個忙碌的工作室', q:'工作夥伴拿出一個半完成的裝置，希望你協助完成，\n「在開始之前，你會先向對方詢問什麼問題？」', opts:[{t:'「這東西最後要達成什麼效果？」',k:'smart'}, {t:'「確定每個零件都沒有缺漏？」',k:'cautious'}, {t:'「它的運作原理是什麼？」',k:'sharp'}]},
        {bg:'JPG/敏銳理性_Q4.jpg', lead:'你推開門，耀眼的光線閃了你一下，當視線恢復，眼前是一個忙碌的工作室', q:'裝置突然自己啟動，零件開始亂轉，\n「面對這個突發事件，你會怎麼做？」', opts:[{t:'按下緊急開關，避免更多混亂',k:'careful'}, {t:'找到問題源頭，修正錯誤',k:'smart'}, {t:'尋求現場更專業的人協助',k:'cautious'}]},
        {bg:'JPG/敏銳理性_Q5.jpg', lead:'你推開門，耀眼的光線閃了你一下，當視線恢復，眼前是一個忙碌的工作室', q:'任務完成，你一個可以獲得強大力量的工藝品...\n「你會選擇哪個作為獎勵？」', opts:[{t:'看穿任何人的想法',k:'sharp'}, {t:'解析錯誤的訊息或事件',k:'careful'}, {t:'預知未來的可能',k:'smart'}]}
      ]
    }
};
const KEY_MAP = {
    extravert:{playful:'淘氣',humorous:'幽默',lively:'活潑',generous:'大方'},
    introvert:{calm:'冷靜',gentle:'文靜',steady:'沉穩',shy:'害羞'},
    caring:{soft:'溫柔',kind:'善良',patient:'耐心',upbeat:'樂觀'},
    decisive:{brave:'勇敢',confident:'自信',decisive:'果斷',independent:'獨立'},
    analytic:{sharp:'敏銳',careful:'細心',smart:'聰明',cautious:'謹慎'}
};

let quizState = {
    name: '玩家', gender: 'male',
    scores: { extravert:0, introvert:0, decisive:0, analytic:0, caring:0 },
    currentStage: 1, qIndex: 0, mainType: 'extravert', traitScores: {} ,
    history: []
};

// ==========================================
// 6. 測驗核心邏輯 (question.html)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('view-quiz')) {
        quizState.name = localStorage.getItem('user_name') || '玩家';
        let storedGender = localStorage.getItem('user_gender');
        quizState.gender = storedGender === '女' ? 'female' : 'male';
        startStage1();
    }
});

function showView(viewId) {
    document.querySelectorAll('.stage').forEach(el => el.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    window.scrollTo(0, 0);
}

function startStage1() {
    quizState.currentStage = 1; 
    quizState.qIndex = 0;
    quizState.scores = { extravert:0, introvert:0, decisive:0, analytic:0, caring:0 };
    quizState.history = [];
    renderQuestion();
    showView('view-quiz');
}

function renderQuestion() {
    let list = (quizState.currentStage === 1) ? DB.stage1 : (DB.stage2[quizState.mainType] || DB.stage2['extravert']);
    
    if (quizState.qIndex >= list.length) {
        (quizState.currentStage === 1) ? finishStage1() : finishStage2();
        return;
    }

    const item = list[quizState.qIndex];
    const bgVideo = document.getElementById('quiz-bg-video');
    const bgImg = document.getElementById('quiz-bg-img'); 

    if (item.bg) {
        if (item.bg.endsWith('.webm') || item.bg.endsWith('.mp4')) {
            if(bgImg) bgImg.style.display = 'none';
            if(bgVideo) {
                bgVideo.style.display = 'block';
                bgVideo.src = item.bg;
                bgVideo.play().catch(e => console.log(e));
            }
        } else if (item.bg.endsWith('.jpg') || item.bg.endsWith('.png')) {
            if(bgVideo) {
                bgVideo.style.display = 'none';
                bgVideo.pause();
            }
            if(bgImg) {
                bgImg.style.display = 'block';
                bgImg.src = item.bg;
            }
        }
    } else {
        if(bgVideo) bgVideo.style.display = 'none';
        if(bgImg) bgImg.style.display = 'none';
    }

    document.getElementById('quiz-lead').textContent = item.lead || ''; 
    document.getElementById('quiz-q').textContent = item.q;
    
    const optsDiv = document.getElementById('quiz-options');
    optsDiv.innerHTML = ''; 

    item.opts.forEach(opt => {
        const card = document.createElement('div');
        card.className = 'option-card';
        card.onclick = () => handleVote(opt.k);

        const btnText = document.createElement('div');
        btnText.className = 'opt-pill-btn';
        btnText.textContent = opt.t;

        card.appendChild(btnText);
        optsDiv.appendChild(card);
    });

    const totalQuestions = 10;
    const currentGlobalQ = (quizState.currentStage - 1) * 5 + quizState.qIndex + 1;
    const percent = (currentGlobalQ / totalQuestions) * 100;
    document.getElementById('quiz-progress').style.width = percent + '%';
}
function handleVote(key) {
    if (quizState.currentStage === 1) {
        if (quizState.scores[key] !== undefined) quizState.scores[key]++;
    } else {
        quizState.traitScores[key] = (quizState.traitScores[key] || 0) + 1;
    }
    quizState.history.push(key);
    quizState.qIndex++;
    renderQuestion();
}

// ==========================================
// 7. 過場畫面 (Interlude) 邏輯
// ==========================================
function finishStage1() {
    let best = 'extravert', max = -1;
    for (let k in quizState.scores) {
        if (quizState.scores[k] > max) { max = quizState.scores[k]; best = k; }
    }
    quizState.mainType = best;
    const info = DB.interludes[best] || DB.interludes['extravert'];

    const bgVideo = document.getElementById('quiz-bg-video');
    if (bgVideo) {
        bgVideo.pause();
        bgVideo.src = "";
    }

    const bgImg = document.getElementById('interlude-bg-img');
    const btnText = document.getElementById('interlude-btn-text');
    const btnContainer = document.getElementById('interludeBtnContainer');

    if (bgImg) bgImg.src = info.bg;
    if (btnText) btnText.textContent = info.btn;

    showView('view-interlude');

    if (btnContainer) {
        btnContainer.style.display = 'none';
        setTimeout(() => {
            btnContainer.style.display = 'flex';
        }, 1500);
    }
}

function startStage2() {
    quizState.currentStage = 2; 
    quizState.qIndex = 0;       
    quizState.traitScores = {}; 
    showView('view-quiz');      
    renderQuestion();           
}

document.addEventListener('DOMContentLoaded', () => {
    const interludeBtn = document.getElementById('interludeBtnContainer');
    if (interludeBtn) {
        interludeBtn.onclick = function() {
            startStage2();
        };
    }
});

// ==========================================
// 8. 最終結果與資料儲存
// ==========================================
function finishStage2() {
    document.getElementById('quiz-bg-video').src = '';

    const currentTraits = KEY_MAP[quizState.mainType]; 
    let bestTraitKey = null;
    let maxScore = -1;
    
    if(currentTraits) {
        bestTraitKey = Object.keys(currentTraits)[0];
        for (let key in currentTraits) {
            const score = quizState.traitScores[key] || 0;
            if (score > maxScore) { maxScore = score; bestTraitKey = key; }
        }
    }

    const traitName = currentTraits ? currentTraits[bestTraitKey] : '淘氣'; 
    const genderSuffix = quizState.gender === 'male' ? '男' : '女';
    const finalTitle = traitName + genderSuffix; 

    const resultImg = document.getElementById('res-bg-img');
    if(resultImg) {
        resultImg.src = `Quiz results page/${finalTitle}.jpg`;
    }
    const resVideo = document.getElementById('res-dynamic-video');
    if(resVideo) {
        resVideo.src = `Quiz results page/${finalTitle}.webm`;
        resVideo.load(); 
        resVideo.play().catch(e => console.log("影片自動播放失敗:", e));
    }
    document.getElementById('res-name').textContent = quizState.name;

    const listStage1 = DB.stage1;
    const listStage2 = DB.stage2[quizState.mainType] || DB.stage2['extravert'];
    const textChoices = quizState.history.map((key, index) => {
        let question;
        let stageLabel = "";
        if (index < listStage1.length) {
            question = listStage1[index];
            stageLabel = "(1)"; 
        } else {
            question = listStage2[index - listStage1.length];
            stageLabel = "(2)";
        }
        if(!question) return key; 
        const targetOpt = question.opts.find(opt => opt.k === key);
        return targetOpt ? `${stageLabel}${targetOpt.t}` : key;
    });

    const currentRecord = {
        name: quizState.name,
        gender: quizState.gender,
        result: finalTitle,
        choices: textChoices,  
        time: new Date().toLocaleString()
    };

    let allRecords = [];
    try {
        allRecords = JSON.parse(localStorage.getItem('quiz_all_data') || '[]');
    } catch(e) { allRecords = []; }

    allRecords.push(currentRecord);
    localStorage.setItem('quiz_all_data', JSON.stringify(allRecords));

    try {
        localStorage.setItem('photobooth_template', JSON.stringify({
            role: finalTitle, 
            image: '心理測驗模板.jpg'
        }));
    } catch (e) { console.log('LocalStorage Error:', e); }

    showView('view-result');
}

// ==========================================
// 9. 首頁：滾輪連動視差動畫 (🔥 加入效能優化節流閥)
// ==========================================
let scrollTicking = false;

window.addEventListener('scroll', () => {
    if (!scrollTicking) {
        window.requestAnimationFrame(() => {
            const windowHeight = window.innerHeight;

            const section7 = document.getElementById('current-status-section');
            if (section7) {
                const rect7 = section7.getBoundingClientRect();
                let scrollDistance7 = -rect7.top;
                let totalScrollable7 = rect7.height - windowHeight;
                let progress7 = scrollDistance7 / totalScrollable7;
                progress7 = Math.max(0, Math.min(1, progress7));
                section7.style.setProperty('--p2', progress7);
            }

            const section8 = document.getElementById('learn-sign-section');
            if (section8) {
                const rect8 = section8.getBoundingClientRect();
                let scrollDistance8 = -rect8.top;
                let totalScrollable8 = rect8.height - windowHeight; 
                let progress8 = scrollDistance8 / totalScrollable8;
                progress8 = Math.max(0, Math.min(1, progress8));

                let activeIndex = Math.floor(progress8 * 3.99); 

                const learnItems = document.querySelectorAll('.learn-item');
                const learnVideos = document.querySelectorAll('.learn-video');

                learnItems.forEach((item, index) => {
                    if (index === activeIndex) {
                        item.classList.add('active');
                    } else {
                        item.classList.remove('active');
                    }
                });

                learnVideos.forEach((video, index) => {
                    if (index === activeIndex) {
                        if (!video.classList.contains('active')) {
                            video.classList.add('active');
                            video.currentTime = 0; 
                            video.play().catch(e => console.log("影片播放失敗", e));
                        }
                    } else {
                        video.classList.remove('active');
                        video.pause();
                    }
                });
            }

            // 🎯 圖標總覽進度計算
            const section10 = document.getElementById('icon-overview-section');
            if (section10) {
                const rect10 = section10.getBoundingClientRect();
                let scrollDistance10 = -rect10.top;
                let totalScrollable10 = rect10.height - windowHeight;
                let progress10 = scrollDistance10 / totalScrollable10;
                progress10 = Math.max(0, Math.min(1, progress10));
                
                section10.style.setProperty('--p3', progress10);
            }

            const section12 = document.getElementById('spec-details-section');
            const seqImg = document.getElementById('spec-sequence-img');
            
            if (section12 && seqImg) {
                const rect12 = section12.getBoundingClientRect();
                let scrollDistance12 = -rect12.top;
                let totalScrollable12 = rect12.height - windowHeight;
                
                let progress12 = scrollDistance12 / totalScrollable12;
                progress12 = Math.max(0, Math.min(1, progress12));
                
                let activeIndex = Math.floor(progress12 * 3.99); 
                let imgNum = String(activeIndex + 1).padStart(2, '0');
                
                const newSrc = `PNG/圖標規範細節${imgNum}.png`;
                if (!seqImg.src.includes(newSrc)) {
                    seqImg.src = newSrc;
                }
            }
            scrollTicking = false;
        });
        scrollTicking = true;
    }
}, { passive: true }); // 🎯 告訴瀏覽器這不會阻擋滾動，大幅提升效能！

// ==========================================
// 10. 第五區域：滑到時自動播放客群動畫
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const audienceVideo = document.getElementById('audience-video');
    
    if (audienceVideo) {
        const videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    audienceVideo.play().catch(e => console.log("影片播放失敗:", e));
                } else {
                    audienceVideo.pause();
                    audienceVideo.currentTime = 0;
                }
            });
        }, { threshold: 0.5 }); 

        videoObserver.observe(audienceVideo);
    }
});

// ==========================================
// 11. 第六區域：放大鏡跟隨特效
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const whyLearnSection = document.getElementById('why-learn-section');
    const textClear = document.getElementById('textClear');
    const textBlurred = document.getElementById('textBlurred'); 
    const magGlass = document.getElementById('magnifyingGlass');

    if (whyLearnSection && textClear && magGlass && textBlurred) {
        const updateMagnifier = (e) => {
            const rect = whyLearnSection.getBoundingClientRect();
            
            let clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            let clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
            
            let x = clientX - rect.left;
            let y = clientY - rect.top;

            textClear.style.setProperty('--x', `${x}px`);
            textClear.style.setProperty('--y', `${y}px`);
            magGlass.style.setProperty('--x', `${x}px`);
            magGlass.style.setProperty('--y', `${y}px`);
            
            textBlurred.style.setProperty('--x', `${x}px`);
            textBlurred.style.setProperty('--y', `${y}px`);
        };

        whyLearnSection.addEventListener('mousemove', updateMagnifier);
        
        whyLearnSection.addEventListener('touchmove', (e) => {
            updateMagnifier(e);
        }, { passive: true });
    }
});

// ==========================================
// 12. 第七區域：滑到時自動播放現況動畫與打字機
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const statusVideo = document.getElementById('status-video');
    const statusTitle = document.getElementById('status-title');
    
    if (statusVideo) {
        const statusObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    statusVideo.play().catch(e => console.log("影片播放失敗:", e));
                    if (statusTitle) statusTitle.classList.add('is-active');
                } else {
                    statusVideo.pause();
                    statusVideo.currentTime = 0;
                    if (statusTitle) statusTitle.classList.remove('is-active');
                }
            });
        }, { threshold: 0.5 });

        statusObserver.observe(statusVideo);
    }
});


// ==========================================
// 14. 第十區域：圖標點擊替換與滑鼠橫向滾動
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const iconItems = document.querySelectorAll('.icon-item');
    const mainWebm = document.getElementById('main-webm');
    const descImg = document.getElementById('desc-img'); 

    iconItems.forEach(item => {
        item.addEventListener('click', () => {
            const iconName = item.querySelector('.icon-name').innerText.trim();
            
            if (mainWebm) mainWebm.style.opacity = 0;
            if (descImg) descImg.style.opacity = 0;

            setTimeout(() => {
                if (mainWebm) {
                    mainWebm.src = `Icon overview/${iconName}.webm`;
                    mainWebm.load(); 
                    mainWebm.play().catch(e => console.log("圖標影片播放失敗:", e));
                    mainWebm.style.opacity = 1; 
                }

                if (descImg) {
                    descImg.src = `Icon overview/${iconName}_說明.png`;
                    descImg.alt = `${iconName} 說明`;
                    descImg.onload = () => {
                        descImg.style.opacity = 1;
                    };
                }
            }, 200); 
        });
    });

    const iconSelector = document.getElementById('icon-selector');
    const dragOverlay = document.getElementById('drag-overlay'); 
    let hideOverlayTimeout; 

    if (iconSelector) {
        if (dragOverlay) {
            const overlayObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        hideOverlayTimeout = setTimeout(() => {
                            dragOverlay.style.opacity = '0';
                        }, 3000);
                        overlayObserver.unobserve(entry.target); 
                    }
                });
            }, { threshold: 0.5 });
            overlayObserver.observe(iconSelector);
        }

        let isDown = false;
        let startX;
        let scrollLeft;

        iconSelector.addEventListener('mousedown', (e) => {
            isDown = true;
            startX = e.pageX - iconSelector.offsetLeft;
            scrollLeft = iconSelector.scrollLeft;

            if (dragOverlay) {
                clearTimeout(hideOverlayTimeout);
                dragOverlay.style.opacity = '0';
            }
        });

        iconSelector.addEventListener('mouseleave', () => { isDown = false; });
        iconSelector.addEventListener('mouseup', () => { isDown = false; });

        iconSelector.addEventListener('mousemove', (e) => {
            if (!isDown) return; 
            e.preventDefault(); 
            const x = e.pageX - iconSelector.offsetLeft;
            const walk = (x - startX) * 1.5; 
            iconSelector.scrollLeft = scrollLeft - walk;
        });

        const icons = iconSelector.querySelectorAll('img');
        icons.forEach(icon => {
            icon.addEventListener('dragstart', (e) => e.preventDefault());
        });
    }
});

// ==========================================
// 預載第十二區的序列圖片，防止滑動時閃爍
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const preloadImages = [];
    for (let i = 1; i <= 4; i++) {
        let img = new Image();
        img.src = `PNG/圖標規範細節0${i}.png`;
        preloadImages.push(img);
    }
});

// ==========================================
// 第十三區域：專屬單頁翻閱閱讀器 (支援動態生成 50 頁)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const track = document.getElementById('slider-track');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');

    if (track && prevBtn && nextBtn) {
        
        // 🎯 1. 動態生成 50 頁圖片
        track.innerHTML = ''; // 確保軌道是空的
        const totalPages = 50; // 總頁數設定
        
        for (let i = 1; i <= totalPages; i++) {
            // 自動補零邏輯：1 -> '01', 9 -> '09', 10 -> '10'
            const pageNum = i.toString().padStart(2, '0'); 
            
            const slide = document.createElement('div');
            slide.className = 'slide-page';
            if (i === 1) slide.classList.add('active'); // 第一頁預設啟用
            else slide.classList.add('waiting');        // 其他頁等待中
            
            const img = document.createElement('img');
            img.src = `JPG/圖標規範手冊${pageNum}.jpg`;
            img.alt = `頁面 ${i}`;
            
            // 防止圖片拖曳時產生破圖或預設的禁止符號
            img.addEventListener('dragstart', e => e.preventDefault());
            
            slide.appendChild(img);
            track.appendChild(slide);
        }

        // 🎯 2. 抓取剛剛生成的所有頁面，並綁定翻頁邏輯
        const slides = document.querySelectorAll('.slide-page');
        let currentIndex = 0;
        const totalSlides = slides.length;

        const updateSlider = () => {
            slides.forEach((slide, index) => {
                slide.classList.remove('active', 'flipped', 'waiting');
                slide.style.zIndex = totalSlides - index;

                if (index < currentIndex) {
                    slide.classList.add('flipped');
                } else if (index === currentIndex) {
                    slide.classList.add('active');
                } else {
                    slide.classList.add('waiting');
                }
            });

            // 控制按鈕的亮暗狀態
            if (currentIndex === 0) prevBtn.classList.add('disabled');
            else prevBtn.classList.remove('disabled');

            if (currentIndex === totalSlides - 1) nextBtn.classList.add('disabled');
            else nextBtn.classList.remove('disabled');
        };

        // 按鈕點擊翻頁
        prevBtn.addEventListener('click', () => {
            if (currentIndex > 0) { currentIndex--; updateSlider(); }
        });
        nextBtn.addEventListener('click', () => {
            if (currentIndex < totalSlides - 1) { currentIndex++; updateSlider(); }
        });

        // 🎯 3. 滑鼠拖曳翻頁邏輯
        let startX = 0;
        let isDragging = false;

        track.addEventListener('mousedown', (e) => {
            startX = e.pageX;
            isDragging = true;
        });

        const endDrag = (e) => {
            if (!isDragging) return;
            isDragging = false;
            
            const diff = e.pageX - startX;
            if (diff < -50 && currentIndex < totalSlides - 1) {
                currentIndex++;
                updateSlider();
            } else if (diff > 50 && currentIndex > 0) {
                currentIndex--;
                updateSlider();
            }
        };

        track.addEventListener('mouseup', endDrag);
        track.addEventListener('mouseleave', endDrag);

        // 初始化第一次的畫面狀態
        updateSlider();
    }
});
// ==========================================
// 17. 全域導覽列與 LOGO 顯示/隱藏控制
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar');
    const logo = document.querySelector('.floating-logo'); 
    const overviewSection = document.getElementById('icon-overview-section');

    if ((navbar || logo) && overviewSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (navbar) navbar.classList.add('navbar-hidden');
                    if (logo) logo.classList.add('hidden');
                } else {
                    if (navbar) navbar.classList.remove('navbar-hidden');
                    if (logo) logo.classList.remove('hidden');
                }
            });
        }, { 
            threshold: 0.2 
        });

        observer.observe(overviewSection);
    }
});
// ==========================================
// 13. 第九 -> 第十區：GSAP 延遲橫向滑入 (多滑一下才出現)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);

        const container = document.getElementById('icon-slide-container');
        const overviewSection = document.getElementById('icon-overview-section');

        if (container && overviewSection) {
            let tl = gsap.timeline({
                scrollTrigger: {
                    trigger: container,
                    start: "top top",
                    // 🎯 修改 1：將滾動空間從 150% 加長到 200%，容納結尾的緩衝時間
                    end: "+=200%", 
                    pin: container,
                    scrub: true
                }
            });

            // 1. 進場前停頓緩衝 (佔 25% 滾動時間)
            tl.to({}, { duration: 0.5 }); 

            // 2. 橫向滑入動畫 (佔 50% 滾動時間)
            tl.to(overviewSection, {
                x: 0, 
                ease: "none",
                duration: 1
            });
            
            // 🎯 修改 2：新增這行「結尾停頓緩衝」(佔 25% 滾動時間)
            // 魔法就在這！畫面完全滑入後，會死死鎖定在滿版狀態，多滑幾下才會放行往下滾。
            tl.to({}, { duration: 0.5 }); 
        }
    }
});

// ==========================================
// 18. 導覽列精準跳轉 (延遲滑入版)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.navbar a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            
            if (targetId === '#' || targetId === 'index.html#') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            else if (targetId === '#what-is-section') {
                e.preventDefault();
                const targetEl = document.getElementById('what-is-section');
                if (targetEl) window.scrollTo({ top: targetEl.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' });
            }
            else if (targetId === '#icon-overview-section') {
                e.preventDefault();
                const container = document.getElementById('icon-slide-container');
                if (container) {
                    const spacer = container.closest('.pin-spacer') || container;
                    const absoluteTop = spacer.getBoundingClientRect().top + window.scrollY;
                    // 🎯 計算跳轉定點：軌道頂部 + 1.5 倍螢幕高 (剛好是滑入結束的位置)
                    const targetY = absoluteTop + (window.innerHeight * 1.5); 
                    window.scrollTo({ top: targetY, behavior: 'smooth' });
                }
            }
        });
    });
});

// ==========================================
// 19. 左下角「智慧返回按鈕」邏輯 
// ==========================================
let backBtnTicking = false;
window.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('back-to-top-btn');
    const container = document.getElementById('icon-slide-container');
    const specDetailsSection = document.getElementById('spec-details-section');

    if (backBtn) {
        let targetLocation = 'home';
        window.addEventListener('scroll', () => {
            if (!backBtnTicking) {
                window.requestAnimationFrame(() => {
                    const scrollY = window.scrollY;
                    const windowHeight = window.innerHeight;
                    if (scrollY < windowHeight * 0.5) backBtn.classList.add('hidden');
                    else if (container && specDetailsSection) {
                        const spacer = container.closest('.pin-spacer') || container;
                        const overviewTargetY = spacer.getBoundingClientRect().top + scrollY + (windowHeight * 1.5);
                        const specTop = specDetailsSection.getBoundingClientRect().top + scrollY;

                        if (scrollY > overviewTargetY - (windowHeight * 0.5) && scrollY < specTop - (windowHeight * 0.5)) backBtn.classList.add('hidden');
                        else if (scrollY >= specTop - (windowHeight * 0.5)) { backBtn.classList.remove('hidden'); targetLocation = 'overview'; }
                        else { backBtn.classList.remove('hidden'); targetLocation = 'home'; }
                    }
                    backBtnTicking = false;
                });
                backBtnTicking = true;
            }
        }, { passive: true });

        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (targetLocation === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
            else if (targetLocation === 'overview' && container) {
                const spacer = container.closest('.pin-spacer') || container;
                window.scrollTo({ top: spacer.getBoundingClientRect().top + window.scrollY + (window.innerHeight * 1.5), behavior: 'smooth' });
            }
        });
    }
});

// ==========================================
// 21. 導覽列滾動連動亮起 (Scroll Spy)
// ==========================================
let navTicking = false;
window.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.navbar .nav-item');
    
    window.addEventListener('scroll', () => {
        if (!navTicking) {
            window.requestAnimationFrame(() => {
                const scrollY = window.scrollY;
                const windowHeight = window.innerHeight;
                let activeIndex = 0; 
                
                const whatIsSection = document.getElementById('what-is-section');
                if (whatIsSection && scrollY >= whatIsSection.getBoundingClientRect().top + scrollY - (windowHeight * 0.3)) activeIndex = 1; 

                const container = document.getElementById('icon-slide-container');
                if (container) {
                    const spacer = container.closest('.pin-spacer') || container;
                    const targetY = spacer.getBoundingClientRect().top + scrollY + (windowHeight * 1.5);
                    if (scrollY >= targetY - (windowHeight * 0.5)) activeIndex = 2;
                }

                navItems.forEach((item, index) => {
                    if (index === 3) return; 
                    if (index === activeIndex) item.classList.add('active'); 
                    else item.classList.remove('active'); 
                });
                navTicking = false;
            });
            navTicking = true;
        }
    }, { passive: true });
});

// ==========================================
// 🎯 22. 第九區右下角：「瀏覽所有圖標」按鈕跳轉
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const goToOverviewBtn = document.getElementById('go-to-overview-btn');
    if (goToOverviewBtn) {
        goToOverviewBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const container = document.getElementById('icon-slide-container');
            if (container) {
                const spacer = container.closest('.pin-spacer') || container;
                window.scrollTo({ top: spacer.getBoundingClientRect().top + window.scrollY + (window.innerHeight * 1.5), behavior: 'smooth' });
            }
        });
    }
});

// ==========================================
// 🎯 錨點跳轉修正：確保精準回到圖標總覽
// ==========================================
window.addEventListener('load', () => {
    if (window.location.hash === '#icon-overview-section') {
        const container = document.getElementById('icon-slide-container');
        if (container) {
            setTimeout(() => {
                const spacer = container.closest('.pin-spacer') || container;
                window.scrollTo({ top: spacer.getBoundingClientRect().top + window.scrollY + (window.innerHeight * 1.5), behavior: 'smooth' });
            }, 150);
        }
    }
});

// ==========================================
// 🎯 第五區域：客群文字自動淡入與離開隱藏觸發器
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const audienceSection = document.getElementById('target-audience-section');
    const audienceVideo = document.getElementById('audience-video');
    
    if (audienceSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    audienceSection.classList.add('is-active');
                    if (audienceVideo) audienceVideo.play().catch(e => console.log(e));
                } else {
                    audienceSection.classList.remove('is-active');
                    if (audienceVideo) {
                        audienceVideo.pause();
                        audienceVideo.currentTime = 0;
                    }
                }
            });
        }, { threshold: 0.3 }); 

        observer.observe(audienceSection);
    }
});



// ==========================================
// 🎯 23. 手語介紹 FAQ 點擊展開邏輯
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const faqQuestions = document.querySelectorAll('.faq-question');

    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            const currentItem = this.parentElement;
            const isActive = currentItem.classList.contains('active');

            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('active');
            });

            if (!isActive) {
                currentItem.classList.add('active');
            }
        });
    });
});

// ==========================================
// 🎯 FAQ 角色眼球跟隨鼠標邏輯 (無遮罩完美圓形版)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const eyes = document.querySelectorAll('.eye');
    
    if (eyes.length > 0) {
        window.addEventListener('mousemove', (e) => {
            eyes.forEach(eye => {
                const pupil = eye.querySelector('.pupil');
                if (!pupil) return;

                const rect = eye.getBoundingClientRect();
                const eyeCenterX = rect.left + (rect.width / 2);
                const eyeCenterY = rect.top + (rect.height / 2);
                
                const deltaX = e.clientX - eyeCenterX;
                const deltaY = e.clientY - eyeCenterY;
                const angle = Math.atan2(deltaY, deltaX);
                
                // 🎯 關鍵修改：拿掉 + 8，讓瞳孔的中心點精準鎖定在範圍內，
                // 配合 CSS 拿掉裁切，它就會是一個永遠不會被切斷的完美圓形！
                const maxRadius = (eye.offsetWidth / 2) - (pupil.offsetWidth / 2);
                
                // 靈敏度除以 5，保持非常機靈的追蹤感
                const distance = Math.min(
                    maxRadius, 
                    Math.hypot(deltaX, deltaY) / 5 
                );
                
                const moveX = Math.cos(angle) * distance;
                const moveY = Math.sin(angle) * distance;
                
                pupil.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
            });
        });
    }
});

// ==========================================
// 🎯 沉浸式轉場跳轉邏輯 (B+C 結合 - 終極防呆版)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const startTeachBtn = document.getElementById('start-teach-btn');

    if (startTeachBtn) {
        startTeachBtn.addEventListener('click', function(e) {
            e.preventDefault(); 
            
            let circle = document.getElementById('transition-circle');
            if (!circle) {
                circle = document.createElement('div');
                circle.id = 'transition-circle';
                circle.className = 'transition-circle';
                document.body.appendChild(circle);
            }

            const x = e.clientX;
            const y = e.clientY;
            
            circle.style.left = `${x}px`;
            circle.style.top = `${y}px`;
            void circle.offsetWidth; 
            circle.classList.add('active');

            // 🎯 修改這裡：抓取目前畫面上顯示的圖標名稱，並傳到下一頁
          // 🎯 修改這裡：精確從圖片網址抓取檔名，避免抓到 "圖標"
            setTimeout(() => {
                const descImg = document.getElementById('desc-img');
                let targetIcon = "樓梯"; // 預設值
                if (descImg && descImg.src) {
                    // 解碼網址，並利用正則表達式精準抓出 "XXX_說明.png" 前面的字
                    const decodedSrc = decodeURIComponent(descImg.src);
                    const match = decodedSrc.match(/([^\/]+)_說明\.png$/);
                    if (match && match[1]) {
                        targetIcon = match[1]; // 成功抓到 "電梯"、"禁止吸菸" 等名稱
                    }
                }
                window.location.href = `icon-teach.html?icon=${encodeURIComponent(targetIcon)}`;
            }, 700);
        });
    }
// ==========================================
// 🎯 錨點跳轉修正：確保精準回到圖標總覽，解決橫向滑入空白的 Bug
// ==========================================
window.addEventListener('load', () => {
    // 如果網址帶有 #icon-overview-section，強制進行精準滾動
    if (window.location.hash === '#icon-overview-section') {
        const wrapper = document.getElementById('horizontal-track-wrapper');
        
        if (wrapper) {
            // 延遲 150ms，等待 GSAP 和 3D 角色圖片載入完成，確保高度計算準確
            setTimeout(() => {
                // 🎯 殺手鐧：強制將瀏覽器偷偷加上的「原生橫向滾動」歸零，防止滑出空白！
                wrapper.scrollLeft = 0; 
                
                // 🎯 放棄使用 scrollIntoView，改用 GSAP 邏輯計算垂直高度
                const spacer = wrapper.closest('.pin-spacer') || wrapper;
                const absoluteTop = spacer.getBoundingClientRect().top + window.scrollY;
                
                // 目標位置：軌道區塊的最頂部 + 1 個螢幕高度 
                // (只要往下滾 1 個螢幕高，GSAP 就會自動幫我們完美橫移到圖標總覽)
                const targetY = absoluteTop + window.innerHeight;

                window.scrollTo({ 
                    top: targetY, 
                    behavior: 'smooth' 
                });
            }, 150);
        }
    }
});
});