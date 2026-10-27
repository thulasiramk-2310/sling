// Project copy and owner-repository screenshots verified on 27 October 2026.
// World materials remain code-authored. Screenshot provenance: public/projects/sources.json.
const text=(en,ta)=>({en,ta})
const image=(src,width,height,en,ta)=>({src:'projects/'+src,width,height,caption:text(en,ta)})

export const PROJECT_DETAILS={
  ArkaOS:{
    id:'arkaos',status:text('Developer preview','உருவாக்க முன்னோட்டம்'),
    stack:['Rust','bootc','KDE Plasma','Linux'],
    overview:text('A desktop that makes the system image replaceable and personal data yours. ArkaOS combines an immutable Linux base with atomic updates, rollback and a Rust privacy daemon.','கணினியின் அடிப்படை அமைப்பைப் பாதுகாத்து, தனிப்பட்ட தரவைக் கட்டுப்பாட்டில் வைத்திருக்க உதவும் Linux இயக்க முறைமை. முழுப் புதுப்பிப்புகள், மீட்டமைப்பு மற்றும் Rust தனியுரிமைச் சேவையுடன் உருவாக்கப்பட்டுள்ளது.'),
    highlights:[text('Immutable system image with atomic updates and rollback.','மாற்ற முடியாத கணினி அமைப்பு; முழுப் புதுப்பிப்புகளும் மீட்டமைப்பும்.'),text('A Rust daemon coordinates privacy controls and reporting.','தனியுரிமைக் கட்டுப்பாடுகளையும் அறிக்கைகளையும் ஒருங்கிணைக்கும் Rust சேவை.'),text('A KDE Plasma desktop with an original shell and setup experience.','தனித்த தோற்றம் மற்றும் தொடக்க அமைப்புடன் KDE Plasma பணிமேடை.')],
    note:text('Developer Preview 1. Experimental software; the repository documents its current limits.','Developer Preview 1. சோதனை நிலையில் உள்ளது; தற்போதைய வரம்புகள் களஞ்சியத்தில் உள்ளன.'),
    media:[image('arka-desktop.webp',1440,900,'ArkaOS desktop · actual Developer Preview 1 capture','ArkaOS பணிமேடை · உண்மையான Developer Preview 1 படம்'),image('arka-privacy.webp',1440,900,'Privacy report · from the ArkaOS repository','தனியுரிமை அறிக்கை · ArkaOS களஞ்சியத்திலிருந்து')],
  },
  'TRX-AI':{
    id:'trx-ai',status:text('Developer tool','உருவாக்குநர் கருவி'),stack:['Python','Local LLMs','CLI','Multi-agent review'],
    overview:text('An engineering assistant that stays in the terminal. Hybrid intent routing directs requests to conversational or code-review workflows; analyzer, generator, critic and fixer stages produce structured results.','டெர்மினலில் இயங்கும் பொறியியல் உதவியாளர். கலப்பு நோக்கத் தேர்வு, உரையாடல் அல்லது குறியீடு மதிப்பாய்வு வழியைத் தேர்ந்தெடுக்கிறது; பல முகவர்கள் கட்டமைக்கப்பட்ட முடிவுகளை வழங்குகின்றனர்.'),
    highlights:[text('Local-model review with routing, fallbacks and runtime status.','உள்ளூர் மாதிரிகள், மாற்று செயல்பாடுகள் மற்றும் இயக்க நிலைத் தகவல்கள்.'),text('A staged code-review pipeline with structured feedback.','கட்டமைக்கப்பட்ட கருத்துகளுடன் படிப்படியான குறியீடு மதிப்பாய்வு.'),text('Saved fixes, history and smoke checks for repeatable workflows.','திருத்தங்களைச் சேமித்தல், வரலாறு மற்றும் மீண்டும் இயக்கக்கூடிய சோதனைகள்.')],
    walkthrough:'https://github.com/thulasiramk-2310/TRX-AI/blob/main/assets/demo/trx-demo.mp4',
    media:[image('trx-terminal.webp',1280,720,'TRX-AI terminal walkthrough · actual repository recording','TRX-AI டெர்மினல் செயல்முறை · களஞ்சியத்தின் உண்மையான பதிவு')],
  },
  'StudyFlow AI':{
    id:'studyflow-ai',status:text('Learning platform','கற்றல் தளம்'),stack:['React','TypeScript','Spring Boot','FastAPI','LangGraph','PostgreSQL'],
    overview:text('A shared workspace for study groups and teams. Members upload notes, ask source-backed questions and plan sessions; student and professional modes adapt the same workflow to different audiences.','படிப்புக் குழுக்கள் மற்றும் அணிகளுக்கான கூட்டுப் பணித்தளம். குறிப்புகளைப் பதிவேற்றி, ஆதாரத்துடன் பதில்களைப் பெற்று, அமர்வுகளைத் திட்டமிடலாம்; மாணவர் மற்றும் தொழில்முறைப் பயன்பாட்டுக்கு ஏற்ப மொழிநடை மாறும்.'),
    highlights:[text('Answers grounded in the group’s own notes, with file and page sources.','குழுவின் குறிப்புகளிலிருந்து, கோப்பு மற்றும் பக்க ஆதாரங்களுடன் பதில்கள்.'),text('Organizer-reviewed session planning and meeting minutes.','ஒருங்கிணைப்பாளர் மதிப்பாய்வுடன் அமர்வுத் திட்டங்களும் கூட்டக் குறிப்புகளும்.'),text('A service-based architecture separating accounts, study data and AI.','கணக்குகள், படிப்புத் தரவு மற்றும் AI ஆகியவற்றைத் தனித்த சேவைகளாகப் பிரிக்கும் அமைப்பு.')],
    walkthrough:'https://github.com/thulasiramk-2310/studyflow-ai/blob/main/docs/media/studyflow-demo.mp4',
    media:[image('studyflow-notes.webp',1440,900,'Ask AI · answers with their source notes','Ask AI · ஆதாரக் குறிப்புகளுடன் பதில்கள்'),image('studyflow-team.webp',1440,900,'Professional mode · the same workspace for teams','தொழில்முறை முறை · அணிகளுக்கான அதே பணித்தளம்')],
  },
  VARA:{
    id:'vara',status:text('Systems project','கணினி அமைப்புத் திட்டம்'),stack:['Go','SHA-256','Transactional storage','CLI','Self-hosted Hub'],
    overview:text('A distributed version-control platform built around explicit protocols and content-addressed objects. The local engine, recovery model and Hub make repository operations inspectable rather than opaque.','வெளிப்படையான நெறிமுறைகள் மற்றும் உள்ளடக்க முகவரியிடப்பட்ட பொருட்களைக் கொண்ட பகிர்ந்த பதிப்புக் கட்டுப்பாட்டுத் தளம். உள்ளூர் இயந்திரம், மீட்பு அமைப்பு மற்றும் Hub மூலம் களஞ்சியச் செயல்பாடுகளை ஆய்வு செய்யலாம்.'),
    highlights:[text('Content identity, transactional writes and crash recovery.','உள்ளடக்க அடையாளம், பரிவர்த்தனை எழுதுதல் மற்றும் செயலிழப்பிலிருந்து மீட்பு.'),text('Three-way merge, conflict resolution and repository verification.','மூன்று வழி இணைப்பு, முரண்பாட்டுத் தீர்வு மற்றும் களஞ்சியச் சரிபார்ப்பு.'),text('A self-hosted Hub with repository browsing, diffs and search.','களஞ்சியக் கோப்புகள், மாற்றங்கள் மற்றும் தேடலுக்கான சுயமாக இயக்கும் Hub.')],
    media:[],
  },
  'CreditGuard AI':{
    id:'creditguard-ai',status:text('Concept in progress','உருவாக்கத்தில் உள்ள கருத்து'),stack:['AI','Risk modelling'],
    overview:text('An exploration of credit-risk scoring and suspicious-activity detection. This entry is a concept; there is no public release or published result to present.','கடன் அபாய மதிப்பீடு மற்றும் சந்தேகமான செயல்பாடுகளைக் கண்டறியும் முயற்சி. இது கருத்து நிலையில் உள்ளது; வெளியிடப்பட்ட மென்பொருளோ ஆய்வு முடிவுகளோ இல்லை.'),
    highlights:[],media:[],
  },
  'kural-kv':{
    id:'kural-kv',status:text('Reproduction research','மீளாய்வு ஆராய்ச்சி'),stack:['Python','PyTorch','GQA','KV-cache evaluation'],
    overview:text('A reproduction study of cache-eviction methods on small grouped-query attention models. The repository keeps methods, held-out replications and evidence grades alongside the findings.','சிறிய grouped-query attention மாதிரிகளில் cache நீக்க முறைகளை மீளாய்வு செய்யும் ஆராய்ச்சி. முறைகள், தனித்த மீள்சோதனைகள் மற்றும் ஆதார மதிப்பீடுகள் முடிவுகளுடன் பதிவு செய்யப்பட்டுள்ளன.'),
    highlights:[text('Shared prefill for comparisons across policies and budgets.','கொள்கைகள் மற்றும் நினைவக அளவுகளை ஒப்பிட ஒரே prefill.'),text('Environment and numerical checks before collecting results.','முடிவுகளைச் சேகரிக்கும் முன் சூழல் மற்றும் எண்ணியல் சோதனைகள்.'),text('Limitations, withdrawn arms and retracted claims remain in the record.','வரம்புகள், விலக்கப்பட்ட சோதனைகள் மற்றும் திரும்பப் பெறப்பட்ட கூற்றுகள் பதிவில் உள்ளன.')],media:[],
  },
  SysOracle:{
    id:'sysoracle',status:text('Open-source collaboration','திறந்த மூலக் கூட்டுப் பணி'),stack:['Rust','Lua','Terminal UI'],
    overview:text('A terminal system monitor with live resource graphs and programmable alerts. Keyboard-driven views expose processes, memory and CPU activity without leaving the development environment.','நேரடி வள வரைபடங்கள் மற்றும் நிரல்படுத்தக்கூடிய அறிவிப்புகளுடன் டெர்மினல் கணினிக் கண்காணிப்பான். விசைப்பலகை வழி காட்சிகள் மூலம் செயல்முறைகள், நினைவகம் மற்றும் CPU பயன்பாட்டைப் பார்க்கலாம்.'),
    highlights:[text('Live CPU, memory, process and network views.','நேரடி CPU, நினைவகம், செயல்முறை மற்றும் பிணையக் காட்சிகள்.'),text('Lua rules for programmable monitoring alerts.','கண்காணிப்பு அறிவிப்புகளுக்கான Lua விதிகள்.'),text('Built with Ravindran S.; contributor credits are in the repository.','Ravindran S. உடன் உருவாக்கப்பட்டது; பங்களிப்பாளர் விவரங்கள் களஞ்சியத்தில் உள்ளன.')],media:[],
  },
}

export const PROJECT_UI={
  en:{label:'Selected work',details:'Inside the project',source:'Source code',walkthrough:'Watch walkthrough',website:'Visit website',previous:'Previous project',next:'Next project',screens:'From the actual project',close:'Back to the journey',search:'Search repositories'},
  ta:{label:'தேர்ந்தெடுத்த படைப்புகள்',details:'திட்டத்தின் உள்ளே',source:'மூலக் குறியீடு',walkthrough:'செயல்முறையைப் பார்க்க',website:'இணையதளம்',previous:'முந்தைய திட்டம்',next:'அடுத்த திட்டம்',screens:'உண்மையான திட்டத்திலிருந்து',close:'பயணத்திற்குத் திரும்ப',search:'களஞ்சியங்களில் தேடு'},
}
