// All the words on the site, in English and Tamil. Edit this file to change the text.
// Facts come from Ram's resume and GitHub READMEs.

export const LINKS = {
  github: 'https://github.com/thulasiramk-2310',
  linkedin: 'https://www.linkedin.com/in/thulasiram-k-60a864328',
  resume: 'https://github.com/thulasiramk-2310/portfolio/blob/main/Thulasiram_K_2026.pdf',
  // EDIT: the address shown in the Contact stop.
  email: 'thulasiramk.git@gmail.com',
}

// The five stops, in road order. `id` matches the section id in index.html.
export const STOP_IDS = ['chennai', 'mamallapuram', 'thanjavur', 'madurai', 'rameswaram']

const gh = (repo) => `${LINKS.github}/${repo}`
// For projects without a public repo yet, the link searches your repositories.
const search = (q) => `${LINKS.github}?tab=repositories&q=${encodeURIComponent(q)}`

export const PROJECTS = [
  {
    name: 'ArkaOS',
    tag: 'Rust · Linux',
    href: gh('Arka'),
    line: {
      en: 'A privacy-first, immutable Linux desktop OS. Atomic, fully rollbackable updates, and a Rust daemon that keeps privacy settings from drifting.',
      ta: 'தனியுரிமையை முதன்மையாகக் கொண்ட, மாற்ற முடியாத Linux டெஸ்க்டாப் இயக்க முறைமை. முழுமையாகத் திரும்பப்பெறக்கூடிய புதுப்பிப்புகள், தனியுரிமை அமைப்புகளைக் காக்கும் Rust டீமன்.',
    },
  },
  {
    name: 'TRX-AI',
    tag: 'Python · LLMs',
    href: gh('TRX-AI'),
    line: {
      en: 'A terminal-first, multi-agent code reviewer (analyzer, generator, critic, fixer) on local LLMs. 91% accuracy on a held-out set.',
      ta: 'உள்ளூர் LLM-களில் இயங்கும், டெர்மினல் முதன்மை பல-முகவர் குறியீடு மதிப்பாய்வாளர். தனித்த சோதனைத் தொகுப்பில் 91% துல்லியம்.',
    },
  },
  {
    name: 'StudyFlow AI',
    tag: 'Microservices · RAG',
    href: gh('studyflow-ai'),
    line: {
      en: 'A learning platform for study groups and teams: questions are answered only from the group’s own notes, with sources, plus an AI session planner.',
      ta: 'படிப்புக் குழுக்களுக்கும் அணிகளுக்குமான கற்றல் தளம்: குழுவின் சொந்தக் குறிப்புகளிலிருந்து மட்டுமே, ஆதாரத்துடன் பதில்கள்; AI அமர்வுத் திட்டமிடுபவர்.',
    },
  },
  {
    name: 'VARA',
    tag: 'Go · Systems',
    href: gh('vara'),
    line: {
      en: 'A content-addressed, transactional distributed version control system in Go, designed RFC-first.',
      ta: 'Go-வில் எழுதப்பட்ட, உள்ளடக்க-முகவரி அடிப்படையிலான, பரிவர்த்தனை சார்ந்த பகிர்ந்த பதிப்புக் கட்டுப்பாட்டு அமைப்பு.',
    },
  },
  {
    // EDIT: description and link are drafts; there is no public repo for this yet.
    name: 'CreditGuard AI',
    tag: 'AI',
    href: search('creditguard'),
    line: {
      en: 'An AI model that scores credit risk and flags suspicious activity.',
      ta: 'கடன் அபாயத்தை மதிப்பிட்டு சந்தேகமான செயல்பாட்டைக் குறிக்கும் AI மாதிரி.',
    },
  },
  {
    // EDIT: description and link are drafts; there is no public repo for this yet.
    name: 'RECALL X',
    tag: 'AI',
    href: search('recall'),
    line: {
      en: 'AI-powered memory: save what you learn and recall it when you need it.',
      ta: 'நீங்கள் கற்றதைச் சேமித்து தேவைப்படும்போது நினைவூட்டும் AI நினைவகம்.',
    },
  },
]

// Numbers from the resume, shown in the About stop.
export const STATS = [
  { value: '1826', en: 'LeetCode rating · top 7%', ta: 'LeetCode மதிப்பீடு · முதல் 7%' },
  { value: '635+', en: 'problems solved', ta: 'தீர்த்த கணக்குகள்' },
  { value: '2', en: 'hackathon wins', ta: 'ஹேக்கத்தான் வெற்றிகள்' },
  { value: 's2n-tls', en: 'AWS open-source contributor', ta: 'AWS திறந்த மூல பங்களிப்பாளர்' },
]

export const SKILLS = ['Python', 'C/C++', 'Go', 'Rust', 'Kotlin', 'JavaScript', 'PyTorch', 'React', 'FastAPI', 'Docker', 'AWS', 'Linux']

export const JOBS = [
  {
    role: { en: 'Software Engineer Intern', ta: 'மென்பொருள் பொறியாளர் பயிற்சியாளர்' },
    org: 'Presidio',
    dates: { en: 'Jun – Jul 2026', ta: 'ஜூன் – ஜூலை 2026' },
    body: {
      en: 'Full-stack engineering programme: system design, backend and API design, advanced React, CI/CD with Terraform and Kubernetes, and generative AI. Capstone: a containerised full-stack app with a RAG feature.',
      ta: 'முழு-அடுக்கு பொறியியல் பயிற்சி: சிஸ்டம் வடிவமைப்பு, பின்னணி மற்றும் API வடிவமைப்பு, React, Terraform, Kubernetes உடன் CI/CD, உருவாக்க AI. இறுதித் திட்டம்: RAG வசதியுடன் கூடிய முழு-அடுக்கு செயலி.',
    },
  },
  {
    role: { en: 'Participant, Amazon ML Summer School', ta: 'பங்கேற்பாளர், Amazon ML கோடைப் பள்ளி' },
    org: 'Amazon',
    dates: { en: '2026', ta: '2026' },
    body: {
      en: 'Selected for Amazon’s scientist-led programme on machine learning, deep learning, generative AI and LLMs.',
      ta: 'இயந்திரக் கற்றல், ஆழ்ந்த கற்றல், உருவாக்க AI, LLM குறித்த Amazon விஞ்ஞானிகள் நடத்தும் பயிற்சிக்குத் தேர்வானேன்.',
    },
  },
  {
    role: { en: 'Cloud Computing Intern', ta: 'கிளவுட் கம்ப்யூட்டிங் பயிற்சியாளர்' },
    org: 'Chennai Institute of Technology',
    dates: { en: '2025', ta: '2025' },
    body: {
      en: 'Built a real-time monitoring dashboard on a concurrent Go backend (REST and WebSockets), and shipped a companion CLI on PyPI.',
      ta: 'Go பின்னணியில் (REST, WebSockets) நேரடி கண்காணிப்புப் பலகையை உருவாக்கி, அதனுடன் ஒரு CLI-ஐ PyPI-இல் வெளியிட்டேன்.',
    },
  },
]

export const AWARDS = {
  en: ['Winner · TI Forge Hackathon', 'Winner · AI for Sustainability Hackathon 2026', '4th · IISc Bangalore Coding Competition', 'Top 10 · TGF 2.0 Google TechSprint'],
  ta: ['வெற்றி · TI Forge ஹேக்கத்தான்', 'வெற்றி · AI for Sustainability ஹேக்கத்தான் 2026', '4-ஆம் இடம் · IISc பெங்களூரு போட்டி', 'முதல் 10 · TGF 2.0 Google TechSprint'],
}

export const STRINGS = {
  en: {
    'loader.note': 'Turn your sound on / Switch to desktop',
    'loader.start': 'Start',
    'loader.loading': 'Loading',
    'loader.ready': 'Ready for the trip',
    'nav.chennai': 'Chennai',
    'nav.mamallapuram': 'Mamallapuram',
    'nav.thanjavur': 'Thanjavur',
    'nav.madurai': 'Madurai',
    'nav.rameswaram': 'Rameswaram',
    'nav.label': 'Trip stops',
    'hud.stop': 'Stop',
    'phase.sunrise': 'Sunrise',
    'phase.noon': 'Noon',
    'phase.sunset': 'Sunset',
    'phase.night': 'Night',
    'hero.hi': 'Vanakkam, I am',
    'hero.name': 'Thulasiram K.',
    'hero.nick': '(Ram)',
    'hero.place': 'Chennai, Tamil Nadu, India',
    'hero.scroll': 'Scroll to start the trip',
    'about.kicker': 'Stop 2 · Mamallapuram',
    'about.title': 'About me',
    'about.body': 'I’m Ram, a computer science student (AI & ML) at Chennai Institute of Technology, class of 2028. I like the hard, unglamorous parts of software: concurrent backends, multi-agent LLM systems, an immutable Linux OS, and developer tools that remember a project’s history.',
    'about.body2': 'The Shore Temple has stood against the sea here for 1,300 years because someone cared about every joint. I try to build software the same way.',
    'about.edu': 'B.E. Computer Science (AI & ML) · Chennai Institute of Technology · 2024–2028',
    'about.photo': 'Ram, in Chennai',
    'projects.kicker': 'Stop 3 · Thanjavur',
    'projects.title': 'Projects',
    'projects.intro': 'Things I’ve built. Each one opens on GitHub.',
    'projects.view': 'View on GitHub',
    'exp.kicker': 'Stop 4 · Madurai',
    'exp.title': 'Experience',
    'exp.awards': 'Wins and ranks',
    'contact.kicker': 'Stop 5 · Rameswaram',
    'contact.title': 'Contact',
    'contact.body': 'End of the road, start of the next trip. Say hello.',
    'contact.email': 'Email',
    'contact.github': 'GitHub',
    'contact.linkedin': 'LinkedIn',
    'contact.resume': 'Resume',
    'contact.resumeVal': 'PDF',
    'contact.play': 'Play: Auto Dash',
    'game.title': 'Auto Dash',
    'game.help': 'Dodge the traffic. Grab filter coffee. Use arrow keys, or swipe and tap.',
    'game.vehicle': 'Pick your ride',
    'game.auto': 'Auto',
    'game.bike': 'Bike',
    'game.start': 'Start',
    'game.score': 'Score',
    'game.best': 'Best',
    'game.over': 'Crash!',
    'game.restart': 'Restart',
    'game.close': 'Close',
    'game.coffee': 'Coffee',
    'game.play': 'Play the game',
    'sound.on': 'Sound on',
    'sound.off': 'Sound off',
    'lang.switch': 'தமிழ்',
    'ctl.lang': 'language',
    'ctl.sound': 'sound',
    'ctl.play': 'play',
    'lang.aria': 'Switch language to Tamil',
    'cookie.text': 'This site can use cookies for anonymous visit statistics. Nothing loads unless you accept.',
    'cookie.accept': 'Accept',
    'cookie.reject': 'Reject',
    'cookie.settings': 'Cookie settings',
    'webgl.title': 'Your browser cannot show the 3D trip',
    'webgl.body': 'WebGL is not available here, so the road trip is turned off. All the content is below, and the game still works.',
    'footer.made': 'Made in Chennai with Three.js, GSAP and Lenis.',
  },
  ta: {
    'loader.note': 'ஒலியை இயக்குங்கள் / டெஸ்க்டாப்பில் பாருங்கள்',
    'loader.start': 'தொடங்கு',
    'loader.loading': 'ஏற்றுகிறது',
    'loader.ready': 'பயணத்திற்குத் தயார்',
    'nav.chennai': 'சென்னை',
    'nav.mamallapuram': 'மாமல்லபுரம்',
    'nav.thanjavur': 'தஞ்சாவூர்',
    'nav.madurai': 'மதுரை',
    'nav.rameswaram': 'இராமேஸ்வரம்',
    'nav.label': 'பயண நிறுத்தங்கள்',
    'hud.stop': 'நிறுத்தம்',
    'phase.sunrise': 'சூரிய உதயம்',
    'phase.noon': 'நண்பகல்',
    'phase.sunset': 'மாலை',
    'phase.night': 'இரவு',
    'hero.hi': 'வணக்கம், நான்',
    'hero.name': 'துளசிராம் கே.',
    'hero.nick': '(ராம்)',
    'hero.place': 'சென்னை, தமிழ்நாடு, இந்தியா',
    'hero.scroll': 'பயணத்தைத் தொடங்க உருட்டுங்கள்',
    'about.kicker': 'நிறுத்தம் 2 · மாமல்லபுரம்',
    'about.title': 'என்னைப் பற்றி',
    'about.body': 'நான் ராம், சென்னை தொழில்நுட்பக் கல்லூரியில் கணினி அறிவியல் (AI & ML) மாணவன், 2028 பிரிவு. மென்பொருளின் கடினமான பகுதிகளை விரும்புகிறேன்: ஒரே நேரத்தில் இயங்கும் பின்னணிகள், பல-முகவர் LLM அமைப்புகள், மாற்ற முடியாத Linux இயக்க முறைமை, ஒரு திட்டத்தின் வரலாற்றை நினைவில் கொள்ளும் கருவிகள்.',
    'about.body2': 'ஒவ்வொரு இணைப்பையும் யாரோ அக்கறையுடன் செதுக்கியதால்தான் கடற்கரைக் கோயில் 1,300 ஆண்டுகளாகக் கடலை எதிர்த்து நிற்கிறது. நானும் மென்பொருளை அப்படியே உருவாக்க முயல்கிறேன்.',
    'about.edu': 'B.E. கணினி அறிவியல் (AI & ML) · சென்னை தொழில்நுட்பக் கல்லூரி · 2024–2028',
    'about.photo': 'சென்னையில் ராம்',
    'projects.kicker': 'நிறுத்தம் 3 · தஞ்சாவூர்',
    'projects.title': 'திட்டங்கள்',
    'projects.intro': 'நான் உருவாக்கியவை. ஒவ்வொன்றும் GitHub-இல் திறக்கும்.',
    'projects.view': 'GitHub-இல் பார்க்க',
    'exp.kicker': 'நிறுத்தம் 4 · மதுரை',
    'exp.title': 'அனுபவம்',
    'exp.awards': 'வெற்றிகளும் இடங்களும்',
    'contact.kicker': 'நிறுத்தம் 5 · இராமேஸ்வரம்',
    'contact.title': 'தொடர்புக்கு',
    'contact.body': 'சாலையின் முடிவு, அடுத்த பயணத்தின் தொடக்கம். வணக்கம் சொல்லுங்கள்.',
    'contact.email': 'மின்னஞ்சல்',
    'contact.github': 'GitHub',
    'contact.linkedin': 'LinkedIn',
    'contact.resume': 'சுயவிவரம்',
    'contact.resumeVal': 'PDF',
    'contact.play': 'விளையாடு: ஆட்டோ டாஷ்',
    'game.title': 'ஆட்டோ டாஷ்',
    'game.help': 'போக்குவரத்தைத் தவிர்த்து, ஃபில்டர் காபியைப் பிடியுங்கள். அம்புக்குறி விசைகள் அல்லது தொடுதல் பயன்படுத்துங்கள்.',
    'game.vehicle': 'உங்கள் வாகனத்தைத் தேர்ந்தெடுங்கள்',
    'game.auto': 'ஆட்டோ',
    'game.bike': 'பைக்',
    'game.start': 'தொடங்கு',
    'game.score': 'மதிப்பெண்',
    'game.best': 'சிறந்தது',
    'game.over': 'மோதல்!',
    'game.restart': 'மீண்டும் தொடங்கு',
    'game.close': 'மூடு',
    'game.coffee': 'காபி',
    'game.play': 'விளையாடு',
    'sound.on': 'ஒலி இயக்கம்',
    'sound.off': 'ஒலி நிறுத்தம்',
    'lang.switch': 'EN',
    'ctl.lang': 'மொழி',
    'ctl.sound': 'ஒலி',
    'ctl.play': 'விளையாடு',
    'lang.aria': 'மொழியை ஆங்கிலத்திற்கு மாற்று',
    'cookie.text': 'இந்தத் தளம் பெயர் குறிப்பிடாத வருகைப் புள்ளிவிவரங்களுக்கு குக்கீகளைப் பயன்படுத்தலாம். நீங்கள் ஏற்காவிட்டால் எதுவும் ஏற்றப்படாது.',
    'cookie.accept': 'ஏற்கிறேன்',
    'cookie.reject': 'மறுக்கிறேன்',
    'cookie.settings': 'குக்கீ அமைப்புகள்',
    'webgl.title': 'உங்கள் உலாவியால் 3D பயணத்தைக் காட்ட முடியாது',
    'webgl.body': 'இங்கு WebGL இல்லை, எனவே சாலைப் பயணம் நிறுத்தப்பட்டுள்ளது. எல்லா உள்ளடக்கமும் கீழே உள்ளது, விளையாட்டும் இயங்கும்.',
    'footer.made': 'சென்னையில் Three.js, GSAP மற்றும் Lenis கொண்டு உருவாக்கப்பட்டது.',
  },
}

// The role line that types itself in the hero.
export const ROLES = {
  en: ['CS (AI & ML) student', 'Systems & AI builder', 'Amazon ML Summer School ’26', 'Open-source contributor'],
  ta: ['CS (AI & ML) மாணவர்', 'சிஸ்டம்ஸ் & AI உருவாக்குபவர்', 'Amazon ML கோடைப் பள்ளி ’26', 'திறந்த மூல பங்களிப்பாளர்'],
}
