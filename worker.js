// 《他們坐在哪裡？》AI 小幫手「小燈」的後端（Cloudflare Worker）
// 作用：保管 Claude API 金鑰，替網頁呼叫 Claude。金鑰放在 Cloudflare 的秘密變數 ANTHROPIC_API_KEY，不會出現在網頁裡。

const MODEL = 'claude-haiku-4-5-20251001';
// 只接受來自這些網站的請求（你的 GitHub Pages 網址）
const ALLOWED_ORIGINS = ['https://chiaying1230.github.io'];
const MAX_TURNS = 12;      // 一次最多帶幾則對話
const MAX_CHARS = 300;     // 學生每則訊息最多幾個字
const MAX_TOKENS = 300;    // 小燈每次回答最多幾個 token

// ===== 故事內容（和 index.html 相同）=====
const ERAS=[
 {when:'一百多年前　1891–1961', title:'那時候，他們在很遠的地方上學',
  lead:'以前，看不見或聽不見的小孩不能去一般的學校。他們要去很遠的、專門的學校，跟其他小孩分開。',
  alt:'左邊有一間分開的小學校，中間有兩道虛線隔開，右邊是一般學校',
  cap:'橘色是身心障礙的小孩，藍色是其他小孩。他們被線隔開了。',
  word:'盲生、啞生', wordNote:'那時候直接用「看不見」「不能說話」來叫他們。',
  think:'大人覺得：這些小孩好可憐，我們要照顧他們。',
  evs:[
   {y:'1891', t:'臺灣第一所盲人學校', d:'一位英國牧師在臺南開了一間學校，教看不見的小孩認點字、算數學、做手工，讓他們長大後能養活自己。這是臺灣特殊教育的開始。'},
   {y:'1917', t:'臺北也開了一間', d:'臺北設立了教視障和聽障小孩的學校，就是今天臺北啟明學校和啟聰學校的前身。那時候，這種專門的學校是唯一的選擇。'}],
  ask:'如果你的學校離家裡很遠很遠，遠到要住在學校，你會有什麼感覺？'},
 {when:'阿公阿嬤小時候　1962–1983', title:'他們搬到學校旁邊了',
  lead:'一般的學校開始開「特別的班級」，讓身心障礙的小孩也能來。雖然還是坐在不同的教室，但已經在同一個校園裡了。',
  alt:'特別的班級搬到一般學校旁邊，有箭頭表示靠近',
  cap:'橘色的小孩靠過來了，但還是在自己的教室。',
  word:'啟聰、啟明', wordNote:'「啟」是「打開」。大人希望打開他們的耳朵和眼睛。',
  think:'大人覺得：他們哪裡不好，我們要想辦法治好、補起來。',
  evs:[
   {y:'1962', t:'第一個特別的班級', d:'臺北市中山國小開了全臺灣第一個給智能障礙小孩的班級。隔年，屏東仁愛國小也開了給行動不方便的小孩的班級。'},
   {y:'1966', t:'可以在家附近上學了', d:'政府讓看不見的小孩能去住家附近的一般國小，再請老師到學校教他們點字。不用再離家那麼遠了。'},
   {y:'1978', t:'資源班出現', d:'學生大部分時間跟大家一起上課，只有需要的時候去「資源班」加強。這種方式一直用到今天。'},
   {y:'1980', t:'第一部身心障礙的法律', d:'叫做《殘障福利法》。雖然名字用了今天覺得不禮貌的詞，但這是國家第一次用法律照顧身心障礙的人。'}],
  ask:'跟大家在同一個學校，但在不同的教室上課。你覺得這樣算「在一起」嗎？'},
 {when:'爸爸媽媽小時候　1984–1996', title:'法律說：他們也有權利上學',
  lead:'國家訂了法律，寫明身心障礙的小孩一定要能上學，學校不可以拒絕。上學不再是別人的好心，而是每個人本來就有的權利。',
  alt:'資源班在學校裡面，兩群小孩在同一間學校',
  cap:'現在資源班在學校裡面了，大家在同一個屋簷下。',
  word:'殘障', wordNote:'法律用的詞是「殘障」。今天我們不這樣說了，因為這個詞聽起來不太尊重。',
  think:'大人開始覺得：上學是他們的權利，不是我們的好心。',
  evs:[
   {y:'1984', t:'第一部特殊教育法', d:'臺灣第一次用法律保障身心障礙學生上學的權利。從此學校不能隨便拒絕他們，政府也必須提供需要的幫助。'}],
  ask:'「權利」和「好心」有什麼不一樣？想想看：吃飯是你的權利，還是別人對你好？'},
 {when:'現在　1997 年到今天', title:'大家坐在同一間教室',
  lead:'現在，大部分身心障礙的學生和你在同一間教室上課。學校會做斜坡、放大字的課本、請老師幫忙，讓每個人都能一起學習。',
  alt:'所有小孩在同一間教室，有輪椅的同學和斜坡',
  cap:'橘色和藍色坐在一起了，學校也做了斜坡。',
  word:'身心障礙者', wordNote:'把「人」放在前面。他們先是一個人，才是一個有障礙的人。',
  think:'現在我們覺得：不方便的不是他，是環境。把環境改好，大家都可以一起。',
  evs:[
   {y:'1997', t:'改名字了', d:'法律把「殘障」改成「身心障礙者」。同一年特殊教育法也大修，明確規定要讓學生在「最少限制」的環境裡學習，也就是盡量跟大家在一起。'},
   {y:'2014', t:'跟全世界一起', d:'臺灣把聯合國的《身心障礙者權利公約》變成國內的法律。這份公約說：障礙不是那個人的問題，是環境沒有做好。'},
   {y:'2023', t:'要聽他們說話', d:'最新的修法規定，學校要聽學生自己的意見，也要為他們做「合理調整」，例如考試多給一點時間、把課本做成有聲書。'}],
  ask:'你的學校有哪些地方，坐輪椅的同學可能會去不了？可以怎麼改？'}
];

// ===== 小燈的說明書（和 index.html 相同）=====
  var HELLO='嗨，我是小燈！這題沒有標準答案。你先寫下自己的想法，我們一起聊聊。';
var STORY=ERAS.map(function(e,i){return '第'+(i+1)+'個年代｜'+e.when+'｜'+e.title+'\n'+e.lead+'\n當時的叫法：'+e.word+'（'+e.wordNote+'）\n當時的想法：'+e.think+'\n事件：'+
  e.evs.map(function(v){return v.y+' '+v.t+'：'+v.d;}).join('；');}).join('\n\n');
var GLOSS='詞語小字典：\n身心障礙：身體或大腦的某些功能，例如看、聽、說話、走路、學習或控制情緒，和大部分人不太一樣，在生活或上學時需要一些幫忙或調整。例如看不見的人用點字讀書、坐輪椅的人需要斜坡。身心障礙不是生病，也不是做錯事。\n點字：用手指摸紙上凸起的小點來讀的文字。\n資源班：學生大部分時間和全班一起上課，需要時才到資源班，由特教老師幫忙加強。\n合理調整：依照每個人的需要改變做法，例如考試多給時間、把課本做成有聲書。\n權利：每個人本來就應該有的，不是別人給的好心。';
function rules(i){ return '你是「小燈」，陪國小學生（大約 8 到 12 歲）討論的 AI 小幫手。學生正在讀互動故事《他們坐在哪裡？》，講臺灣一百多年來，身心障礙學生從被分開上學，到和大家坐在同一間教室的過程。\n\n'+
  '現在學生在「'+ERAS[i].when+'｜'+ERAS[i].title+'」這一頁，討論的「想一想」題目是：\n「'+ERAS[i].ask+'」\n\n'+
  '討論的方式：\n1. 只用繁體中文，句子短、字簡單，像溫柔的大哥哥大姊姊。每次 2 到 3 句，不用列點、不用 Markdown 符號。\n'+
  '2. 接下來每則「學生寫的話」才是學生自己說的。題目裡的句子和例子（例如題目中的吃飯）是題目的，不是學生想到的，不要說成是學生的。\n'+
  '3. 仔細讀學生寫的話，先判斷他是在回答、在提問、還是說不知道。如果他在回答，用他自己的關鍵詞具體稱讚他說得好的地方，不要說他「提出問題」。\n'+
  '4. 這題沒有標準答案，不要說學生錯。稱讚之後，只問一個能讓他再往前想一步的小追問；不要問他已經回答過的事，也不要自己先講一大段道理或替他說出答案。\n'+
  '5. 可以把學生的想法和這一頁的故事連起來，例如「你說的就像 1978 年的資源班…」。\n'+
  '6. 學生說不知道、或請你給提示時，給一個生活裡的小例子或從另一個角度問他，不要直接替他回答。\n'+
  '7. 聊了三、四輪之後，用一兩句話幫他整理他自己說過的想法，並稱讚他的思考。\n'+
  '8. 學生問詞語的意思時，先直接回答，再帶回題目。歷史事件、年份、法律只能根據故事內容說，故事裡沒有的就說「這個故事裡沒有寫到，可以問問老師喔」。\n'+
  '9. 用尊重的說法：說「身心障礙者」「坐輪椅的同學」。只有在解釋歷史時才提到舊說法。\n'+
  '10. 不要問學生的名字、學校、住址等個人資料。如果學生說到自己被欺負或很難過，先溫柔地接住他的感受，再請他告訴信任的大人，例如老師或家人。\n'+
  '11. 學生聊到和題目無關的事，簡短回應後，輕輕帶回題目。\n\n'+GLOSS+'\n\n故事內容：\n'+STORY; }


function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}
function reply(body, status, origin) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...cors(origin) } });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (!ALLOWED_ORIGINS.includes(origin)) return new Response('Forbidden', { status: 403 });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method !== 'POST') return reply({ error: 'method' }, 405, origin);

    let body;
    try { body = await request.json(); } catch { return reply({ error: 'bad_json' }, 400, origin); }
    const era = Number(body && body.era);
    const msgs = Array.isArray(body && body.messages) ? body.messages.slice(-MAX_TURNS) : [];
    if (!(era >= 0 && era < ERAS.length) || !msgs.length) return reply({ error: 'bad_request' }, 400, origin);

    // 整理對話：只接受 user / assistant，限制長度，學生的話加上標記
    const turns = [{ role: 'assistant', content: HELLO }];
    for (const m of msgs) {
      const text = String((m && m.content) || '').trim().slice(0, m && m.role === 'user' ? MAX_CHARS : 600);
      if (!text) continue;
      const role = m.role === 'user' ? 'user' : 'assistant';
      turns.push({ role, content: role === 'user' ? '學生寫的話：「' + text + '」' : text });
    }
    if (turns[turns.length - 1].role !== 'user') return reply({ error: 'bad_request' }, 400, origin);
    // API 要求第一則是 user：把說明書放在 system，對話前補一句開場
    turns.unshift({ role: 'user', content: '（學生打開了討論區）' });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        // cache_control：同一個年代的說明書和故事會被快取，之後只收約十分之一的價錢
        system: [{ type: 'text', text: rules(era), cache_control: { type: 'ephemeral' } }],
        messages: turns,
      }),
    });
    if (res.status === 429) return reply({ error: 'rate_limited' }, 429, origin);
    if (!res.ok) return reply({ error: 'upstream', status: res.status }, 502, origin);
    const data = await res.json();
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
    return reply({ text }, 200, origin);
  },
};
