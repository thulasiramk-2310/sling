export const profile = {
  name: 'YOUR NAME', // Replace with your name. No personal achievements have been invented.
  role: 'Developer. Dreamer. Explorer.',
  introduction: 'Rooted in Tamil Nadu. Driven by curiosity. Building thoughtful software for a world without boundaries.',
  email: '', github: '', linkedin: '',
};
export const skills = ['Python', 'Java', 'C++', 'React', 'TypeScript', 'AI & agents', 'Web development'];
export const chapters = [
  { id:'chennai', name:'Chennai', tamil:'சென்னை', label:'THE BEGINNING', landmark:'Marina Beach & Lighthouse', coordinates:'13.0397° N · 80.2795° E', progress:0, marker:.12,
    kicker:'01 / WHERE IT ALL BEGINS', title:'From Tamil Nadu,', accent:'to the world.', description:'A journey through the places that shaped me.\nAnd the things I’m here to build.' },
  { id:'mamallapuram', name:'Mamallapuram', tamil:'மாமல்லபுரம்', label:'THE CRAFT', landmark:'Shore Temple', coordinates:'12.6165° N · 80.1993° E', progress:.55, marker:.59,
    kicker:'02 / BUILT TO LAST', title:'Carved by time.', accent:'Built with intent.', description:'From Pallava stone to lines of code.\nA fascination with how things are made.' },
  { id:'thanjavur', name:'Thanjavur', tamil:'தஞ்சாவூர்', label:'THE POSSIBILITIES', landmark:'Brihadeeswarar Temple', coordinates:'10.7828° N · 79.1318° E', progress:.82, marker:.86,
    kicker:'03 / THINK BEYOND THE HORIZON', title:'A thousand stories.', accent:'Still unfolding.', description:'Ambition, craft, and a little curiosity.\nThe next chapter is ours to create.' },
];
export type Project = {id:string; title:string; category:string; description:string; stack:string[]; source:string; demo:string; screenshots:string[]};
export const projects:Project[] = [
 { id:'agents', title:'Agentic systems', category:'AI / EXPLORATION 01', description:'Editable project exhibit. Add your real agent workflow, the problem it solves, and your contribution here. This is a content placeholder, not a claimed achievement.', stack:['Python','AI agents','TypeScript'],source:'',demo:'',screenshots:[] },
 { id:'tools', title:'Tools for builders', category:'DEVELOPER TOOLS / EXPLORATION 02', description:'Editable project exhibit. Replace this with your developer tool, browser extension, or open-source work, including real source and demo links.', stack:['React','TypeScript','Web APIs'],source:'',demo:'',screenshots:[] },
 { id:'twins', title:'Worlds in sync', category:'EXPERIMENTAL / EXPLORATION 03', description:'Editable project exhibit. Describe your digital twin, experimental software, or interactive system. Add screenshots and links in src/data/portfolio.ts.',stack:['Three.js','React','Python'],source:'',demo:'',screenshots:[] },
];
