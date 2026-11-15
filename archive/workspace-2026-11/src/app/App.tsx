import {useState} from 'react';
import World from '../experience/canvas/World';
import {useJourneyScroll} from '../hooks/useJourneyScroll';
import {useJourney,travelTo} from '../stores/journey';
import {chapters} from '../data/portfolio';
import {Loading} from '../components/loading/Loading';
import {DetailPanel} from '../components/projects/DetailPanel';
import {MiniMap} from '../components/interface/MiniMap';
import {Arrow,Compass} from '../components/interface/Icons';
import {Sound} from '../components/interface/Sound';
export default function App(){
 useJourneyScroll();const chapter=useJourney(s=>s.chapter),progress=useJourney(s=>s.progress),reduced=useJourney(s=>s.reduced);const c=chapters[chapter];
 const [menu,setMenu]=useState(false);const opening=progress<.09;
 return <main>
  <a className="skip-link" href="#accessible-story" onClick={()=>useJourney.getState().setPanel('about')}>Skip 3D and read the story</a>
  <div className="world"><World/></div><div className="cinematic-shade"/>
  <header className="header"><button className="brand" aria-label="From Tamil Nadu to the world, return to beginning" onClick={()=>travelTo(0)}><span className="brand-symbol" lang="ta">த</span><span>FROM TAMIL NADU<small>TO THE WORLD</small></span></button>
   <nav className={`top-nav ${menu?'nav-open':''}`} aria-label="Portfolio"><button onClick={()=>{useJourney.getState().setPanel('about');setMenu(false);}}>About</button><button onClick={()=>{useJourney.getState().setPanel('work');setMenu(false);}}>Selected work <span>03</span></button><button className="contact-link" onClick={()=>{useJourney.getState().setPanel('contact');setMenu(false);}}>Let’s talk <Arrow diagonal/></button></nav><button className="menu-button" onClick={()=>setMenu(!menu)} aria-expanded={menu}>{menu?'Close':'Menu'} <span>☰</span></button>
  </header>
  <aside className="left-rail"><span className="rail-line"/><span>AN INTERACTIVE PORTFOLIO</span><span className="rail-line"/></aside>
  <div className={`story-copy ${opening?'opening':''}`} key={chapter} id="accessible-story">
   <p className="eyebrow"><span className="tiny-rule"/>{c.kicker}</p>
   <h1>{chapter===0?<>From <em>Tamil Nadu,</em><br/>to the world.</>:<>{c.title}<br/><em>{c.accent}</em></>}</h1>
   <p className="intro-copy">{c.description.split('\n').map((s,i)=><span key={i}>{s}<br/></span>)}</p>
   <button className="explore-button" onClick={()=>opening?travelTo(.16):useJourney.getState().setPanel(chapter===0?'about':chapter===1?'work':'contact')}><span>{opening?'Begin the journey':chapter===0?'Meet the maker':chapter===1?'Explore the work':'Write the next chapter'}</span><span className="round-arrow"><Arrow/></span></button>
   <div className="origin-note"><span className="origin-dot"/><span>{chapter===0?'ROOTED IN CULTURE. BUILDING FOR TOMORROW.':chapter===1?'ANCIENT CRAFT. ENDLESS INSPIRATION.':'GREAT THINGS BEGIN WITH A LITTLE CURIOSITY.'}</span></div>
  </div>
  <div className="location-caption"><span className="caption-cross">+</span><div><span lang="ta" className="location-tamil">{c.tamil}</span><span className="location-name">{c.landmark}</span><small>{c.coordinates}</small></div></div>
  <button className="compass-button" onClick={()=>useJourney.getState().setPanel('journey')} aria-label="Open journey map"><Compass/><span>N</span></button>
  <MiniMap/>
  <div className="scroll-cue"><span className="mouse-icon"><i/></span><span>SCROLL TO TRAVEL<small>TAKE YOUR TIME. THERE’S A WORLD TO SEE.</small></span></div>
  <footer className="journey-footer"><button className="journey-label" onClick={()=>useJourney.getState().setPanel('journey')}><span className="journey-star">✳</span><span>THE JOURNEY<small>THROUGH TAMIL NADU</small></span></button><nav className="chapter-nav" aria-label="Journey chapters">{chapters.map((c,i)=><button key={c.id} className={chapter===i?'active':''} onClick={()=>travelTo(c.progress)} aria-current={chapter===i?'step':undefined}><small>0{i+1}</small><span>{c.name}</span><i/></button>)}</nav><div className="footer-controls"><button className="motion-control" aria-pressed={reduced} onClick={()=>useJourney.getState().setReduced(!reduced)}>{reduced?'MOTION REDUCED':'REDUCE MOTION'}</button><Sound/></div><div className="journey-progress" style={{transform:`scaleX(${progress})`}}/></footer>
  <span className="development-note">ORIGINAL 3D WORLD · DEVELOPMENT STUDY</span>
  <div className="scroll-space" aria-hidden="true"/>
  <DetailPanel/><Loading/>
 </main>;
}
