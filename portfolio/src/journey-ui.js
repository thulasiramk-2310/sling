import { LINKS, PROJECTS, SKILLS, SKILL_DETAILS, SKILL_DETAILS_TA, STATS, STOP_IDS } from './content.js'
import { chapterAt, storyAt } from './scene/story.js'
import { sample } from './scene/timeline.js'
import { getLang, t } from './i18n.js'
import { paintProjectDetails } from './project-details.js'

export function createJourneyUI({onOpen,onClose,onContinue,onReadable}) {
  const root=document.createElement('aside');root.className='journey-caption';root.hidden=true;root.setAttribute('data-lenis-prevent','')
  root.innerHTML='<p class="journey-eyebrow mono"></p><h1 class="journey-heading"></h1><p class="journey-subtitle"></p><div class="story-intro-copy"><p></p><p class="story-education mono"></p><dl class="story-stats"></dl></div><div class="story-skills" aria-live="polite"><p class="story-score mono"></p><div class="story-skill-list"></div></div><button class="journey-read" type="button" aria-controls="stop-detail"></button>'
  const skillFocus=document.createElement('div');skillFocus.className='story-skill-focus';root.querySelector('.story-skills').prepend(skillFocus)
  const arrival=document.createElement('div');arrival.className='arrival-copy'
  const status=document.createElement('p');status.className='arrival-status mono'
  const summary=document.createElement('p');summary.className='arrival-summary'
  const projectList=document.createElement('div');projectList.className='arrival-projects'
  const stopLinks=document.createElement('nav');stopLinks.className='arrival-links'
  arrival.append(status,summary,projectList,stopLinks);root.append(arrival)
  const readingHint=document.createElement('p');readingHint.className='arrival-scroll mono';arrival.append(readingHint)
  const continueButton=document.createElement('button');continueButton.type='button';continueButton.className='journey-continue';continueButton.hidden=true
  continueButton.addEventListener('click',()=>onContinue?.());root.append(continueButton)
  const direction=document.createElement('p');direction.className='journey-direction mono';direction.hidden=true
  const hideButton=document.createElement('button');hideButton.type='button';hideButton.className='journey-clean';hideButton.hidden=true;hideButton.setAttribute('aria-pressed','false')
  const readableButton=document.createElement('button');readableButton.type='button';readableButton.className='journey-readable';readableButton.hidden=true
  readableButton.addEventListener('click',()=>onReadable?.())
  const dialog=document.createElement('dialog');dialog.id='stop-detail';dialog.className='stop-detail';dialog.setAttribute('aria-labelledby','stop-detail-title');dialog.setAttribute('data-lenis-prevent','')
  dialog.innerHTML='<header class="detail-header"><span class="mono" id="stop-detail-title"></span><button class="detail-close" type="button"></button></header><div class="detail-content"></div>'
  const projectDialog=document.createElement('dialog');projectDialog.className='stop-detail project-detail';projectDialog.setAttribute('aria-labelledby','project-title');projectDialog.setAttribute('data-lenis-prevent','')
  projectDialog.innerHTML='<header class="detail-header"><span class="mono">PROJECT</span><button class="detail-close" type="button"></button></header><article><p class="project-status mono"></p><h2 id="project-title"></h2><p class="project-stack mono"></p><p class="project-description"></p><a class="btn btn-line project-source" target="_blank" rel="noopener"></a></article>'
  const connections=document.createElement('aside');connections.className='story-connections';connections.hidden=true
  const contactTitle=document.createElement('p');contactTitle.className='mono';connections.append(contactTitle)
  const contactList=document.createElement('nav');contactList.setAttribute('aria-label','Contact links');connections.append(contactList)
  for(const [name,href] of [['Email','mailto:'+LINKS.email],['GitHub',LINKS.github],['LinkedIn',LINKS.linkedin],['Resume',LINKS.resume]]) {
    const link=document.createElement('a');link.textContent=name+' ↗';link.href=href
    if(!href.startsWith('mailto:')){link.target='_blank';link.rel='noopener'}
    contactList.append(link)
  }
  document.body.append(root,direction,hideButton,readableButton,dialog,projectDialog,connections)
  const sections=STOP_IDS.map(id=>document.getElementById(id)),panels=sections.map(section=>section.querySelector('.panel'))
  let active=0,world=false,clean=false,reading=null,restoreFocus=null,projectIndex=null
  let current=storyAt(0),discovered=[],parked=null,selectedSkill=null
  const titleKeys=['hero.name','story.skills','projects.title','exp.title','journey.bridge','journey.confluence']
  const subtitleKeys=['hero.place','story.collect','journey.projects','journey.experience','journey.crossing','journey.dawn']
  const paintSkill=()=>{
    const skill=selectedSkill??current.skill??discovered.at(-1)??SKILLS[0]
    const details=(getLang()==='ta'?SKILL_DETAILS_TA:SKILL_DETAILS)[skill]??[]
    skillFocus.replaceChildren()
    const skillName=document.createElement('strong');skillName.textContent=skill
    const skillUse=document.createElement('p');skillUse.textContent=details.join(' · ')
    skillFocus.append(skillName,skillUse)
  }
  const paintProject=()=>{
    if(projectIndex!==null) {
      paintProjectDetails(projectDialog,PROJECTS[projectIndex],projectIndex,PROJECTS,getLang(),index=>{projectIndex=index;paintProject()})
    }
  }
  const paint=()=>{
    for(const [index,name] of ['email','github','linkedin','resume'].entries())contactList.children[index].textContent=t('contact.'+name)+' ↗'
    contactList.setAttribute('aria-label',t('contact.title'))
    root.dataset.stage=current.stage
    root.classList.toggle('at-stop',parked!==null)
    document.body.classList.toggle('at-journey-stop',parked!==null)
    arrival.hidden=parked===null && active!==2
    readingHint.textContent=t('journey.scrollContinue')+' ↓'
    status.hidden=parked===null;status.textContent=t('journey.stopped')
    summary.hidden=parked===null;summary.textContent=t('stop.'+STOP_IDS[parked??active])
    continueButton.hidden=parked===null
    const next=parked===null?'':STOP_IDS[parked+1]
    continueButton.textContent=t('journey.continue')+(next?' · '+t('nav.'+next):'')+' →'
    projectList.hidden=active!==2;projectList.replaceChildren()
    if(active===2) for(const [index,project] of PROJECTS.entries()) {
      const button=document.createElement('button');button.type='button';button.className='arrival-project';button.dataset.project=String(index)
      if(project.featured){const kicker=document.createElement('span');kicker.className='mono';kicker.textContent=t('journey.featured');button.append(kicker)}
      const name=document.createElement('strong');name.textContent=project.name+' ↗';button.append(name)
      if(project.featured){const copy=document.createElement('p');copy.textContent=project.line[getLang()]??project.line.en;button.append(copy)}
      button.addEventListener('click',()=>api.openProject(index));projectList.append(button)
    }
    stopLinks.hidden=parked!==5;stopLinks.replaceChildren()
    if(parked===5)for(const link of contactList.children)stopLinks.append(link.cloneNode(true))
    const intro=current.stage==='introduction'
    root.querySelector('.journey-eyebrow').textContent=intro?t('story.intro'):`${String(active+1).padStart(2,'0')} / ${String(STOP_IDS.length).padStart(2,'0')} · ${t('nav.'+STOP_IDS[active])}`
    root.querySelector('.journey-heading').textContent=t(intro?'hero.name':titleKeys[active])
    root.querySelector('.journey-subtitle').textContent=t(intro?'hero.place':subtitleKeys[active])
    root.querySelector('.story-intro-copy>p').textContent=t('story.bioShort')
    root.querySelector('.story-education').textContent=t('about.edu')
    const stats=root.querySelector('.story-stats');stats.replaceChildren()
    for(const item of STATS.slice(0,2)) {const cell=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=item.value;dd.textContent=item[getLang()];cell.append(dt,dd);stats.append(cell)}
    root.querySelector('.journey-read').textContent=t('journey.read')+' ↗'
    root.querySelector('.story-score').textContent=parked===1?`${t('story.skillIndex')} · ${SKILLS.length}`:`${t('story.collected')} ${discovered.length} · ${discovered.length*100} ${t('story.points')}`
    const list=root.querySelector('.story-skill-list');list.replaceChildren()
    for(const name of (parked===1?SKILLS:discovered)){
      const tag=document.createElement('button');tag.type='button';tag.textContent=name
      tag.addEventListener('click',()=>{selectedSkill=name;paintSkill()});list.append(tag)
    }
    paintSkill()
    hideButton.textContent=t(clean?'journey.showUI':'journey.hideUI')
    readableButton.textContent=t('journey.readable')+' ↗'
    dialog.querySelector('.detail-close').textContent=t('journey.close')+' ×'
    if(projectIndex===null)projectDialog.querySelector('.detail-close').textContent=t('journey.close')+' ×'
    if(reading!==null) dialog.querySelector('#stop-detail-title').textContent=t(current.stage==='introduction'?'about.title':'nav.'+STOP_IDS[reading])
    paintProject()
    contactTitle.textContent=t('story.connections')
    direction.textContent=t(current.stage==='greeting'?'story.scroll':current.stage==='bridge-flight'?'story.fly':current.stage==='ascent'?'story.ascent':'story.scroll')+' ↓'
  }
  const restore=({resume=true}={})=>{
    if(reading===null)return
    sections[reading].append(panels[reading]);panels[reading].inert=world;reading=null
    if(!projectDialog.open){
      document.body.classList.remove('reading-stop')
      if(resume){onClose();restoreFocus?.focus({preventScroll:true})}
    }
  }
  const open=()=>{
    if(!world||dialog.open||projectDialog.open)return
    restoreFocus=document.activeElement
    reading=current.stage==='introduction'?1:active
    panels[reading].inert=false;dialog.querySelector('.detail-content').append(panels[reading]);document.body.classList.add('reading-stop')
    paint();onOpen();dialog.showModal();dialog.scrollTop=0;dialog.querySelector('.detail-close').focus({preventScroll:true})
  }
  const close=()=>Promise.all([dialog,projectDialog].filter(modal=>modal.open).map(modal=>new Promise(resolve=>{
    // Callers opening another interface can await panel restoration and the
    // native modal's removal from the top layer before moving keyboard focus.
    modal.addEventListener('close',resolve,{once:true})
    modal.close()
  })))
  root.querySelector('.journey-read').addEventListener('click',open)
  dialog.querySelector('.detail-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',restore)
  projectDialog.querySelector('.detail-close').addEventListener('click',()=>projectDialog.close())
  projectDialog.addEventListener('close',()=>{projectIndex=null;document.body.classList.remove('reading-stop');onClose();restoreFocus?.focus({preventScroll:true})})
  hideButton.addEventListener('click',()=>{clean=!clean;document.body.classList.toggle('clean-journey',clean);hideButton.setAttribute('aria-pressed',String(clean));paint()})
  window.addEventListener('langchange',paint);paint()
  const api={
    setStop(index){if(parked===index)return;parked=index;selectedSkill=null;paint()},
    setReadingProgress(progress){root.style.setProperty('--reading-progress',progress)},
    setReadableAvailable(value){readableButton.hidden=!world||!value},
    setWorldMode(value){
      if(!value){close();connections.hidden=true;readableButton.hidden=true;document.body.classList.remove('connections-visible')}
      world=value;document.body.classList.toggle('world-first',value);root.hidden=hideButton.hidden=direction.hidden=!value;panels.forEach(panel=>{panel.inert=value})
    },
    update(progress,narrative){
      const next=narrative??storyAt(progress),nextSkills=next.discovered??[]
      const changed=next.stage!==current.stage||chapterAt(progress)!==active||nextSkills.length!==discovered.length||next.skill!==current.skill
      current=next;active=chapterAt(progress);discovered=nextSkills
      document.body.dataset.storyStage=current.stage
      document.body.classList.toggle('trip-night',sample(current.road).night>.55)
      const showConnections=world && progress>=.97
      connections.hidden=!showConnections
      document.body.classList.toggle('connections-visible',showConnections)
      if(changed)paint()
    },
    openProject(index){
      if(!PROJECTS[index]||projectDialog.open)return
      if(dialog.open){
        // Finish the chapter handoff now: a dialog's close event is queued.
        // Keep its original world control as the return target, rather than a
        // project button that is about to move back into an inert panel.
        dialog.close()
        restore({resume:false})
      }else restoreFocus=document.activeElement
      projectIndex=index;paintProject();projectDialog.scrollTop=0;onOpen();document.body.classList.add('reading-stop');projectDialog.showModal();projectDialog.querySelector('.detail-close').focus({preventScroll:true})
    },
    close,isOpen:()=>dialog.open||projectDialog.open,
  }
  return api
}
