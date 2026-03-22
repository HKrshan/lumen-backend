function initDust() {
  const canvas = document.getElementById('dust-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles;
  
  function resize() { 
    W = canvas.width = window.innerWidth; 
    H = canvas.height = window.innerHeight; 
  }
  
  function init() {
    particles = [];
    const count = Math.floor((W * H) / 6000);
    for (let i = 0; i < count; i++) {
        particles.push({ 
            x: Math.random()*W, 
            y: Math.random()*H, 
            r: Math.random()*1.3+0.3, 
            vx: (Math.random()-0.5)*0.16, 
            vy: -(Math.random()*0.09+0.03), 
            alpha: Math.random()*0.47+0.08, 
            fadeDir: Math.random()>0.5?1:-1, 
            fadeSpeed: Math.random()*0.003+0.001, 
            hue: Math.random()>0.7?240:260 
        });
    }
  }
  
  function draw() {
    ctx.clearRect(0,0,W,H);
    for (const p of particles) {
      p.x+=p.vx; p.y+=p.vy;
      p.alpha+=p.fadeDir*p.fadeSpeed;
      if(p.alpha<=0.04){p.fadeDir=1;p.alpha=0.04;}
      if(p.alpha>=0.6){p.fadeDir=-1;}
      if(p.y<-2){p.y=H+2;p.x=Math.random()*W;}
      if(p.x<-2)p.x=W+2; if(p.x>W+2)p.x=-2;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`hsla(${p.hue},70%,80%,${p.alpha})`; ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  
  resize(); init(); draw();
  window.addEventListener('resize',()=>{resize();init();});
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDust);
} else {
  initDust();
}
