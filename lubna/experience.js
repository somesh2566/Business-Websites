/* Original, dependency-free WebGL objects. No tracking or external requests. */
(() => {
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let paused=reduced.matches;
  try { paused=paused||sessionStorage.getItem('atelier-motion')==='off'; } catch {}
  const motionButtons=[...document.querySelectorAll('[data-motion]')];
  function syncMotion(){document.documentElement.classList.toggle('motion-off',paused);motionButtons.forEach(b=>{b.textContent=paused?'Enable motion':'Pause motion';b.setAttribute('aria-pressed',String(paused));});}
  motionButtons.forEach(b=>b.addEventListener('click',()=>{paused=!paused;try{sessionStorage.setItem('atelier-motion',paused?'off':'on');}catch{}syncMotion();window.dispatchEvent(new Event('scenechange'));}));syncMotion();
  reduced.addEventListener('change',e=>{paused=e.matches;syncMotion();});
  const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}}),{threshold:0.12});
  document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
  const navToggle=document.querySelector('[data-nav-toggle]');
  if(navToggle){navToggle.addEventListener('click',()=>{const open=navToggle.getAttribute('aria-expanded')!=='true';navToggle.setAttribute('aria-expanded',String(open));document.querySelector('.nav-links').classList.toggle('open',open);});document.querySelectorAll('.nav-links a').forEach(a=>a.addEventListener('click',()=>{navToggle.setAttribute('aria-expanded','false');document.querySelector('.nav-links').classList.remove('open');}));}
  document.querySelectorAll('[data-tabs]').forEach(group=>{group.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{group.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed','false'));button.setAttribute('aria-pressed','true');const scope=group.closest('[data-explorer]')||document;scope.querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==button.dataset.tab);if(button.dataset.color){document.documentElement.style.setProperty('--selected',button.dataset.color);window.dispatchEvent(new CustomEvent('colorchange',{detail:button.dataset.color}));}const briefField=document.querySelector('[data-palette-field]');if(briefField){briefField.value=button.dataset.label||button.textContent.trim().replace(/^0[1-3]\s*/, '').replace(/\s*↗$/, '');briefField.dispatchEvent(new Event('input',{bubbles:true}));}const label=scope.querySelector('[data-current]');if(label)label.textContent=button.dataset.label||button.textContent.trim();}));});
  document.querySelectorAll('[data-brief]').forEach(form=>{
    const out=form.querySelector('output'),copy=form.querySelector('[data-copy]'),mail=form.querySelector('[data-email]'),feedback=form.querySelector('[data-feedback]');
    function update(){const d=new FormData(form);const chunks=[...d.entries()].filter(([k,v])=>String(v).trim()).map(([k,v])=>k+': '+v);const message='Hello, I would like to enquire about '+form.dataset.business+'.\n\n'+chunks.join('\n')+'\n\nPlease let me know availability and next steps.';out.textContent=message;if(mail)mail.href='mailto:'+mail.dataset.email+'?subject='+encodeURIComponent('Enquiry — '+form.dataset.business)+'&body='+encodeURIComponent(message);feedback.textContent='';}
    form.addEventListener('input',update);form.addEventListener('change',update);form.addEventListener('submit',e=>e.preventDefault());update();
    copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(out.textContent);feedback.textContent='Enquiry copied. You can paste it into your preferred messaging app.';}catch{const r=document.createRange();r.selectNodeContents(out);const s=window.getSelection();s.removeAllRanges();s.addRange(r);feedback.textContent='Your enquiry is selected. Press Ctrl+C (or touch and hold to copy).';}});
  });
  const scrollers=[...document.querySelectorAll('[data-scroll-story]')];
  function scroll(){const max=document.documentElement.scrollHeight-innerHeight;document.documentElement.style.setProperty('--page-progress',max?scrollY/max:0);scrollers.forEach(el=>{const r=el.getBoundingClientRect();let p=clamp(-r.top/(el.offsetHeight-innerHeight));el.style.setProperty('--progress',p);const active=Math.min(2,Math.floor(p*3));el.querySelectorAll('[data-chapter]').forEach((c,i)=>{c.classList.toggle('active',i===active);if(i===active)c.setAttribute('aria-current','step');else c.removeAttribute('aria-current');});});}
  addEventListener('scroll',scroll,{passive:true});addEventListener('resize',scroll);scroll();
  const eye=[0,0,7.8];
  function matrix(rx,ry,rz,aspect,scale){
    const cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz);
    const m=[cy*cz,cy*sz,-sy,0,sx*sy*cz-cx*sz,sx*sy*sz+cx*cz,sx*cy,0,cx*sy*cz+sx*sz,cx*sy*sz-sx*cz,cx*cy,0,0,0,0,1];
    const f=1/Math.tan(Math.PI/9),n=.1,far=100;const p=[f/aspect,0,0,0,0,f,0,0,0,0,(far+n)/(n-far),-1,0,0,2*far*n/(n-far),0];
    const model=m.slice();for(let i=0;i<12;i++)m[i]*=scale;m[14]=-eye[2];let out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){out[c*4+r]=0;for(let k=0;k<4;k++)out[c*4+r]+=p[k*4+r]*m[c*4+k];}return{mvp:out,normal:new Float32Array(model)};
  }
  const vert='attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uMVP;uniform mat4 uNormal;uniform float uTime;uniform float uWave;varying vec3 vNormal;varying vec3 vPos;void main(){vec3 p=aPosition;p.z+=sin(p.x*2.1+p.y*1.3+uTime)*uWave;vPos=p;vNormal=normalize((uNormal*vec4(aNormal,0.)).xyz);gl_Position=uMVP*vec4(p,1.);}';
  const frag='precision mediump float;uniform vec3 uColor;uniform float uMetal;varying vec3 vNormal;varying vec3 vPos;void main(){vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;vec3 light=normalize(vec3(-.5,.9,1.3));float d=max(dot(n,light),0.);float spec=pow(max(dot(reflect(-light,n),vec3(0.,0.,1.)),0.),28.);float grain=sin(vPos.x*170.)*sin(vPos.y*170.)*.018;vec3 c=uColor*(.29+d*.76+grain)+vec3(.98,.87,.68)*spec*uMetal;gl_FragColor=vec4(c,1.);}';
  function hex(h){return [1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);}
  function parametric(fn,nu=72,nv=36){const vertices=[],normals=[];const point=(u,v)=>fn(clamp(u),clamp(v));function add(u,v){const p=point(u,v),ua=point(u-.001,v),ub=point(u+.001,v),va=point(u,v-.001),vb=point(u,v+.001);const a=ub.map((x,i)=>x-ua[i]),b=vb.map((x,i)=>x-va[i]);let n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len=Math.hypot(...n)||1;vertices.push(...p);normals.push(...n.map(x=>x/len));}for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){let u=i/nu,v=j/nv,U=(i+1)/nu,V=(j+1)/nv;add(u,v);add(U,v);add(U,V);add(u,v);add(U,V);add(u,V);}return{vertices,normals};}
  function torus(R,r,offset=[0,0,0],rot=0){return parametric((u,v)=>{const a=u*Math.PI*2,b=v*Math.PI*2;let x=(R+r*Math.cos(b))*Math.cos(a),y=(R+r*Math.cos(b))*Math.sin(a),z=r*Math.sin(b);return[x+offset[0],y*Math.cos(rot)-z*Math.sin(rot)+offset[1],y*Math.sin(rot)+z*Math.cos(rot)+offset[2]];},64,16);}
  function cylinder(radius,height,offset=[0,0,0]){return parametric((u,v)=>{const a=u*Math.PI*2;return[Math.cos(a)*radius+offset[0],Math.sin(a)*radius+offset[1],(v-.5)*height+offset[2]];},64,4);}
  function disk(radius,z){return parametric((u,v)=>[Math.cos(u*Math.PI*2)*Math.max(v,.0001)*radius,Math.sin(u*Math.PI*2)*Math.max(v,.0001)*radius,z],64,12);}
  document.querySelectorAll('canvas[data-scene]').forEach(canvas=>{
    const wrap=canvas.parentElement;let gl;try{gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power'});}catch{}if(!gl){wrap.classList.add('no-webgl');return;}
    let meshes=[],program;try{const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};program=gl.createProgram();gl.attachShader(program,sh(gl.VERTEX_SHADER,vert));gl.attachShader(program,sh(gl.FRAGMENT_SHADER,frag));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Unable to link 3D scene');}catch(e){console.warn(e);wrap.classList.add('no-webgl');return;}
    wrap.classList.add('webgl-ready');gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
    const attrs=['aPosition','aNormal'].map(n=>gl.getAttribLocation(program,n));const uniforms={};['uMVP','uNormal','uTime','uWave','uColor','uMetal'].forEach(n=>uniforms[n]=gl.getUniformLocation(program,n));
    function mesh(geometry,color,metal=.3,selectable=false){const buffers=[geometry.vertices,geometry.normals].map(data=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);return b;});meshes.push({buffers,count:geometry.vertices.length/3,color:hex(color),metal,selectable});}
    const type=canvas.dataset.scene;
    if(type==='silk'){
      const cloth=(u,v)=>{const a=(u-.5)*5.0;const twist=Math.sin(u*Math.PI*1.4-.4)*1.1;const w=(v-.5)*2.5;return[a,w*Math.cos(twist)+.25*Math.sin(u*7),w*Math.sin(twist)+.14*Math.sin(v*25+u*3)];};
      mesh(parametric(cloth,100,50),'#71253e',.56,true);
      for(const edge of [0.018,.982])mesh(parametric((u,v)=>{let p=cloth(u,edge+(v-.5)*.009);p[2]+=.015;return p;},100,3),'#c3a36c',.85);
    }else if(type==='room'){
      mesh(parametric((u,v)=>[(u-.5)*4.8,(v-.5)*3.8,Math.cos(u*Math.PI*16)*.17+.25*Math.sin(v*2+u*3)],96,32),'#889071',.16,true);
      mesh(parametric((u,v)=>[(u-.5)*5.1,-1.92,(v-.5)*2.2],12,8),'#d4bea4',.1);
      mesh(parametric((u,v)=>{const a=u*Math.PI*2;return[.45+Math.cos(a)*.66,-1.9+v*.7,.85+Math.sin(a)*.66];},64,8),'#bc674b',.12);
      mesh(parametric((u,v)=>{const a=u*Math.PI*2;return[.45+Math.cos(a)*Math.max(v,.0001)*.66,-1.2,.85+Math.sin(a)*Math.max(v,.0001)*.66];},64,10),'#d48c6b',.13);
      mesh(torus(.63,.035,[.45,-1.21,.85],Math.PI/2),'#a9533e',.18);
    }else{
      mesh(cylinder(1.28,.22),'#b18c4c',.8);
      mesh(disk(1.2,.13),'#c48d70',.25,true);
      mesh(torus(1.28,.07,[0,0,.13]),'#d1ad6d',.95);
      mesh(torus(1.27,.055,[0,1.95,-.12],-.68),'#d1ad6d',.95);
      mesh(parametric((u,v)=>{const a=u*Math.PI*2;let x=Math.cos(a)*Math.max(v,.0001)*1.22,y=Math.sin(a)*Math.max(v,.0001)*1.22;return[x,y*Math.cos(-.68)+1.95,y*Math.sin(-.68)-.12];},64,14),'#bbc9b8',.65);
      for(let i=0;i<3;i++)mesh(torus(.11+i*.025,.025,[1.52+i*.24,-.36+i*.46,.2+i*.12]),'#d6b875',.8);
    }
    let px=0,py=0,dragX=0,dragY=0,start=null,visible=true,last=0,dirty=true,time=0;
    canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();px=(e.clientX-r.left)/r.width-.5;py=(e.clientY-r.top)/r.height-.5;if(start){dragX+=(e.clientX-start[0])*.006;dragY+=(e.clientY-start[1])*.006;start=[e.clientX,e.clientY];}dirty=true;});
    canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;start=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointerup',()=>start=null);canvas.addEventListener('pointercancel',()=>start=null);
    canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key)){e.preventDefault();if(e.key==='Home'){dragX=dragY=0;}else if(e.key==='ArrowLeft')dragX-=.15;else if(e.key==='ArrowRight')dragX+=.15;else if(e.key==='ArrowUp')dragY-=.15;else dragY+=.15;dirty=true;}});
    new IntersectionObserver(es=>{visible=es[0].isIntersecting;dirty=true;},{rootMargin:'80px'}).observe(canvas);
    new ResizeObserver(()=>dirty=true).observe(canvas);
    addEventListener('colorchange',e=>{meshes.filter(m=>m.selectable).forEach(m=>m.color=hex(e.detail));dirty=true;});addEventListener('scenechange',()=>dirty=true);addEventListener('scroll',()=>dirty=true,{passive:true});
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();visible=false;wrap.classList.remove('webgl-ready');wrap.classList.add('no-webgl');});
    function render(now){requestAnimationFrame(render);if(!visible||document.hidden||now-last<32||paused&&!dirty)return;last=now;dirty=false;if(!paused)time=now*.0004;
      const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5);const w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);if(!w||!h)return;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      const progress=clamp((innerHeight-r.top)/(innerHeight+r.height));const turn=paused?0:Math.sin(time*.6)*.08;const base=type==='silk'?[-.12,.25,-.3]:type==='room'?[-.03,-.22,0]:[-.3,-.25,-.22];const scale=Math.min(1,r.width/r.height*.9)*(type==='beauty'?.9:1);
      const mat=matrix(base[0]+dragY+(paused?0:py*.12),base[1]+dragX+turn+(paused?0:px*.22+(progress-.5)*.4),base[2],r.width/r.height,scale);
      gl.uniformMatrix4fv(uniforms.uMVP,false,mat.mvp);gl.uniformMatrix4fv(uniforms.uNormal,false,mat.normal);gl.uniform1f(uniforms.uTime,time);gl.uniform1f(uniforms.uWave,type==='silk'&&!paused?.035:0);
      for(const m of meshes){m.buffers.forEach((b,i)=>{gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(attrs[i]);gl.vertexAttribPointer(attrs[i],3,gl.FLOAT,false,0,0);});gl.uniform3fv(uniforms.uColor,m.color);gl.uniform1f(uniforms.uMetal,m.metal);gl.drawArrays(gl.TRIANGLES,0,m.count);}
    }requestAnimationFrame(render);
  });
})();