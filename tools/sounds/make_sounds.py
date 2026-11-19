"""Synthèse des sons de Relic Forge.

Tous les sons du jeu sont calculés ici (aucun fichier extérieur) :
ce sont des sons originaux, sans licence à respecter.

Pour les recréer (Python 3 avec numpy et scipy, et ffmpeg) :
    python tools/sounds/make_sounds.py apps/web/public/audio
"""
import numpy as np, subprocess, sys, os
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(1234)

def t(d): return np.arange(int(SR*d))/SR
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def lp(x, f, order=2): return sosfilt(butter(order, f, 'lowpass', fs=SR, output='sos'), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, 'highpass', fs=SR, output='sos'), x)
def fade(x, a=0.002, r=0.05):
    n=len(x); A=int(a*SR); R=int(r*SR)
    env=np.ones(n)
    if A: env[:A]=np.linspace(0,1,A)
    if R: env[-R:]*=np.linspace(1,0,R)
    return x*env
def norm(x, peak=0.89): return x/ (np.max(np.abs(x))+1e-9) * peak
def reverb(x, dur=1.2, mix=0.25, damp=3000):
    # Le son source s'éteint doucement : pas de coupure sèche (clic).
    x = fade(x, 0, min(0.25, len(x)/SR/3))
    ir = rng.standard_normal(int(SR*dur)) * np.exp(-t(dur)*5.5/dur)
    ir = lp(ir, damp); ir/=np.sqrt(np.sum(ir**2))
    wet = fftconvolve(x, ir)[:len(x)+int(SR*dur)]
    dry = np.concatenate([x, np.zeros(len(wet)-len(x))])
    return dry*(1-mix) + wet*mix
def save(name, x, q=4):
    x = np.clip(x, -1, 1).astype(np.float32)
    raw = os.path.join(OUT, name+'.f32')
    x.tofile(raw)
    subprocess.run(['ffmpeg','-loglevel','error','-y','-f','f32le','-ar',str(SR),'-ac','1','-i',raw,
                    '-c:a','libvorbis','-q:a',str(q), os.path.join(OUT, name+'.ogg')], check=True)
    os.remove(raw)

def modal(f0, ratios, amps, decays, dur):
    tt=t(dur); y=np.zeros_like(tt)
    for r,a,d in zip(ratios, amps, decays):
        y += a*np.sin(2*np.pi*f0*r*tt + rng.uniform(0,6.28))*np.exp(-tt/d)
    return y

def sweep(n, f_from, f_to, width, bands=16):
    """Souffle dont la hauteur monte : des bandes de bruit qui se relaient en fondu (pas de clic)."""
    out=np.zeros_like(n); pos=np.arange(len(n))/len(n)
    for j,f in enumerate(np.linspace(f_from, f_to, bands)):
        centre=(j+0.5)/bands
        w=np.exp(-((pos-centre)*bands/1.2)**2)
        out+=bp(n, f*(1-width), f*(1+width))*w
    return out

def resonance(x, f, width, decay, dur):
    """Bruit filtré autour d'une fréquence : le « corps » métallique, sans note pure."""
    return bp(x, f*(1-width), f*(1+width))*np.exp(-t(dur)/decay)

def anvil(f0, dur=1.0, bright=1.0, ring=1.0):
    """Un coup de marteau : surtout un choc (« clang »), avec une résonance qui s'éteint vite.
    Pas de notes pures qui tiennent : c'est ce qui donnait un son de clochette."""
    tt=t(dur)
    n=rng.standard_normal(len(tt))
    # Corps métallique : plusieurs bandes de bruit non harmoniques, courtes.
    body=np.zeros_like(tt)
    for r,a,d in [(1,1.0,0.09),(1.59,0.7,0.07),(2.14,0.5,0.05),(2.76,0.35*bright,0.04),(3.9,0.2*bright,0.03)]:
        body+=a*resonance(n, f0*r*rng.uniform(0.97,1.03), 0.06, d*ring, dur)
    # Un peu de vraie résonance, très amortie.
    ratios=np.array([1, 1.59, 2.14, 2.76])*(1+rng.uniform(-0.02,0.02,4))
    tone=modal(f0, ratios, [0.5,0.3,0.2*bright,0.1*bright], np.array([0.22,0.15,0.1,0.07])*ring, dur)
    # Contact du marteau : bruit bref.
    click=bp(n, 1000, 4000)*np.exp(-tt/0.004)*0.8
    # Masse de l'enclume : choc grave et sourd.
    thud=np.sin(2*np.pi*80*tt)*np.exp(-tt/0.1)*1.6
    return lp(body*2.5+tone+click+thud, 4500)

# 8 variantes de frappe
bases=[430,455,480,510,540,570,600,640]
for i,f in enumerate(bases):
    y=anvil(f*rng.uniform(0.98,1.02), dur=0.8)
    save(f'strike-{i+1}', norm(fade(reverb(y,0.4,0.1), r=0.08), 0.8))

# Critique : plus brillant, plus long, double impact.
y=anvil(560, 1.6, bright=1.4, ring=2.0)
y2=np.concatenate([np.zeros(int(0.03*SR)), anvil(820, 1.6-0.03, bright=1.2, ring=1.6)*0.6])
shimmer=resonance(rng.standard_normal(int(1.6*SR)), 1400, 0.1, 0.25, 1.6)*0.6
save('critical', norm(fade(reverb(y+y2+shimmer,0.7,0.18), r=0.2), 0.85))

def bell(f0, dur, decay=1.0):
    tt=t(dur)
    y=modal(f0,[1,2.0,3.01,4.17,5.43],[1,0.5,0.35,0.2,0.1],[decay,decay*0.7,decay*0.5,decay*0.35,decay*0.25],dur)
    return y*(1-np.exp(-tt/0.004))

# Amélioration : le métal résonne en grave, une lueur (souffle filtré) monte. Pas de mélodie.
dur=1.6; tt=t(dur); n=rng.standard_normal(len(tt))
metal=anvil(300, dur, bright=0.8, ring=3.0)*0.8
rise=sweep(n, 500, 2200, 0.15)
rise*=np.sin(np.pi*np.minimum(tt/1.2,1))**2*0.5
y=metal+rise
save('upgrade', norm(fade(reverb(y,1.0,0.25), r=0.3), 0.7))

# Braise éveillée : souffle qui monte + crépitements + note chaude.
dur=1.6; tt=t(dur); n=rng.standard_normal(len(tt))
whoosh=sweep(n, 300, 2500, 0.5)*np.sin(np.pi*np.minimum(tt/0.9,1))**2*0.8
crackle=np.zeros_like(tt)
for _ in range(40):
    p=int(rng.uniform(0.2,1.4)*SR); L=int(0.004*SR); crackle[p:p+L]+=rng.standard_normal(L)*rng.uniform(0.2,0.7)*np.exp(-np.arange(L)/40)
crackle=hp(crackle,1500)
warm=anvil(220, dur, bright=0.6, ring=2.5)*0.3
save('ember', norm(fade(reverb(whoosh+crackle+warm,1.0,0.25),0.01,0.3),0.7))

# Nouveau stade : gong grave + souffle de lumière qui monte (sans clochettes).
dur=4.0; tt=t(dur)
gong=modal(98,[1,1.48,2.03,2.68,3.2,4.1],[1,0.7,0.6,0.4,0.3,0.2],[2.5,2.0,1.6,1.2,0.9,0.7],dur)*(1-np.exp(-tt/0.03))
shim=np.zeros_like(tt)
shim=sweep(rng.standard_normal(len(tt)), 400, 1800, 0.1)
shim*=np.sin(np.pi*np.minimum(tt/3.2,1))**2*0.35
save('stage', norm(fade(reverb(gong+shim,2.0,0.35),0.01,0.6),0.85))

# Ambiance de la Forge : grondement du feu + crépitements, en boucle sans couture.
dur=22; L=int(SR*20); X=int(SR*2)
n=rng.standard_normal(int(SR*dur))
brown=np.cumsum(n); brown=hp(brown,30); brown=lp(brown,350,4); brown/=np.max(np.abs(brown))
mod=1+0.25*np.sin(2*np.pi*0.13*t(dur))+0.15*np.sin(2*np.pi*0.31*t(dur)+1)
roar=brown*mod*0.7
cr=np.zeros(int(SR*dur))
for _ in range(260):
    p=int(rng.uniform(0,dur-0.01)*SR); Ln=int(rng.uniform(0.002,0.008)*SR)
    cr[p:p+Ln]+=rng.standard_normal(Ln)*rng.uniform(0.05,0.5)*np.exp(-np.arange(Ln)/(Ln/4))
cr=bp(cr,1200,7000)
amb=roar+cr*0.6
# boucle : les 2 dernières secondes se fondent dans le début
loop=amb[:L].copy(); tail=amb[L:L+X]; w=np.linspace(0,1,X)
loop[:X]=loop[:X]*w+tail*(1-w)
save('forge-ambience', norm(loop,0.6), q=3)

# Musique provisoire : nappe lente et sombre en ré mineur (Rém, Sib, Fa, Do), 8 s par accord.
def note(freq, d):
    tt=t(d); y=np.zeros_like(tt)
    for det in (-0.004,0,0.004):
        for h in range(1,7):
            y+= (1/h**1.6)*np.sin(2*np.pi*freq*(1+det)*h*tt + rng.uniform(0,6.28))
    env=np.minimum(1, tt/2.5)*np.minimum(1,(d-tt)/2.5)
    return y*env
def hz(m): return 440*2**((m-69)/12)
chords=[[50,57,62,65],[46,53,58,62],[41,48,53,57,60],[48,55,60,64]]
seg=8.0; total=seg*len(chords)*2
music=np.zeros(int(SR*(total+seg)))
for k in range(len(chords)*2):
    s=int(k*seg*SR); c=chords[k%4]
    y=sum(note(hz(m), seg+2.5)*(0.6 if m<48 else 0.35) for m in c)
    music[s:s+len(y)]+=y
# Au deuxième tour, une basse lente et sourde (pas de clochettes).
for k,(m,start) in enumerate([(38,32),(34,40),(29,48),(36,56)]):
    s=int(start*SR); b=note(hz(m),8.5)*0.5; music[s:s+len(b)]+=b
music=lp(music,2500)
music=reverb(music,3.0,0.35,2500)
L=int(SR*total); loop=music[:L].copy(); tail=music[L:]
loop[:len(tail)]+=tail[:L]
save('music', norm(loop,0.5), q=3)
print('ok')