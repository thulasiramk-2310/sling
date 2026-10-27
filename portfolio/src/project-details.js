import { PROJECT_UI } from './project-content.js'

const painted=new WeakMap()
const element=(tag,className,text)=>{
  const node=document.createElement(tag)
  if(className)node.className=className
  if(text)node.textContent=text
  return node
}
const translated=(value,lang)=>typeof value==='string'?value:value?.[lang]??value?.en??''

export function paintProjectDetails(dialog,project,index,projects,lang,onSelect) {
  const key=project.id+':'+lang
  if(painted.get(dialog)===key)return
  painted.set(dialog,key)
  const copy=PROJECT_UI[lang]??PROJECT_UI.en
  dialog.querySelector('.detail-header>span').textContent=copy.label
  dialog.querySelector('.detail-close').textContent=copy.close+' ×'
  const article=dialog.querySelector('article');article.replaceChildren()
  article.append(element('p','project-status mono',translated(project.status,lang)),element('p','project-number mono',String(index+1).padStart(2,'0')+' / '+String(projects.length).padStart(2,'0')))
  const title=element('h2','',project.name);title.id='project-title';article.append(title)
  article.append(element('p','project-description',translated(project.overview??project.line,lang)))
  const stack=element('ul','project-technologies');stack.setAttribute('aria-label',lang==='ta'?'தொழில்நுட்பங்கள்':'Technology stack')
  for(const technology of project.stack??[project.tag])stack.append(element('li','mono',technology))
  article.append(stack)
  const actions=element('div','project-actions')
  // The source remains the first link, independent of screenshots or optional demos.
  for(const [className,label,href] of [
    ['project-source',project.draft?copy.search:copy.source,project.href],
    ['project-website',copy.website,project.website],
    ['project-walkthrough',copy.walkthrough,project.walkthrough],
  ]){
    if(!href)continue
    const link=element('a','btn btn-line '+className,label+' ↗');link.href=href;link.target='_blank';link.rel='noopener';actions.append(link)
  }
  article.append(actions)
  if(project.note)article.append(element('p','project-note',translated(project.note,lang)))
  if(project.highlights?.length){
    const section=element('section','project-inside'),heading=element('h3','',copy.details),list=element('ul','')
    heading.id='project-inside-title';section.setAttribute('aria-labelledby',heading.id)
    for(const item of project.highlights)list.append(element('li','',translated(item,lang)))
    section.append(heading,list);article.append(section)
  }
  if(project.media?.length){
    const gallery=element('section','project-gallery');gallery.setAttribute('aria-label',copy.screens)
    for(const media of project.media){
      const figure=element('figure',''),image=element('img',''),caption=element('figcaption','')
      image.src=media.src;image.width=media.width;image.height=media.height;image.alt=translated(media.caption,lang)
      image.loading='lazy';image.decoding='async';caption.textContent=image.alt
      image.addEventListener('error',()=>{image.hidden=true;figure.classList.add('image-unavailable');caption.textContent=lang==='ta'?'படத்தை ஏற்ற முடியவில்லை. மூலக் களஞ்சியத்தில் பார்க்கலாம்.':'This screenshot could not load. It is also available in the source repository.'},{once:true})
      figure.append(image,caption);gallery.append(figure)
    }
    article.append(gallery)
  }
  const nav=element('nav','project-pagination');nav.setAttribute('aria-label',copy.label)
  for(const [delta,label] of [[-1,copy.previous],[1,copy.next]]){
    const next=(index+delta+projects.length)%projects.length,button=element('button','',delta<0?'← '+label:label+' →')
    button.type='button';button.setAttribute('aria-label',label+': '+projects[next].name)
    button.addEventListener('click',()=>{onSelect(next);dialog.scrollTop=0;dialog.querySelector('#project-title').focus({preventScroll:true})})
    nav.append(button)
  }
  title.tabIndex=-1;article.append(nav)
}
