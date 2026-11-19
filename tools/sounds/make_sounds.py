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

def anvil(f0, dur=1.0, bright=1.0, ring=1.0):
    ratios=np.array([1, 2.32, 4.25, 6.63, 9.38])*(1+rng.uniform(-0.02,0.02,5))
    amps=np.array([1, 0.6, 0.45*bright, 0.3*bright, 0.18*bright])*rng.uniform(0.8,1.2,5)
    decays=np.array([0.45, 0.3, 0.18, 0.12, 0.08])*ring
    y=modal(f0, ratios, amps, decays, dur)
    # Contact du marteau : bruit bref et aigu.
    n=rng.standard_normal(len(y)); click=bp(n, 2000, 9000)*np.exp(-t(dur)/0.006)*1.2
    # Masse de l'enclume : choc grave.
    thud=np.sin(2*np.pi*110*t(dur))*np.exp(-t(dur)/0.05)*0.9
    return y+click+thud

# 8 variantes de frappe
bases=[1180,1250,1320,1400,1480,1560,1650,1740]
for i,f in enumerate(bases):
    y=anvil(f*rng.uniform(0.98,1.02), dur=1.3)
    save(f'strike-{i+1}', norm(fade(reverb(y,0.6,0.15), r=0.08), 0.8))

# Critique : plus brillant, plus long, double impact.
y=anvil(1500, 2.6, bright=1.4, ring=2.2)
y2=np.concatenate([np.zeros(int(0.03*SR)), anvil(2250, 2.6-0.03, bright=1.2, ring=1.6)*0.6])
shimmer=modal(3000,[1,1.51,2.03],[0.3,0.2,0.12],[0.6,0.4,0.3],2.6)
save('critical', norm(fade(reverb(y+y2+shimmer,1.0,0.25), r=0.2), 0.85))

def bell(f0, dur, decay=1.0):
    tt=t(dur)
    y=modal(f0,[1,2.0,3.01,4.17,5.43],[1,0.5,0.35,0.2,0.1],[decay,decay*0.7,decay*0.5,decay*0.35,decay*0.25],dur)
    return y*(1-np.exp(-tt/0.004))

# Amélioration : trois notes de cloche qui montent (la, do#, mi).
dur=1.8; y=np.zeros(int(SR*dur))
for k,(f,start) in enumerate([(880,0),(1108.7,0.09),(1318.5,0.18)]):
    s=int(start*SR); b=bell(f, dur-start, 0.9)*(0.8+0.1*k); y[s:s+len(b)]+=b
save('upgrade', norm(fade(reverb(y,1.2,0.3), r=0.3), 0.7))

# Braise éveillée : souffle qui monte + crépitements + note chaude.
dur=1.6; tt=t(dur); n=rng.standard_normal(len(tt))
sweep=np.zeros_like(n)
for j,f in enumerate(np.linspace(300,2500,12)):
    seg=slice(int(j*len(n)/12), int((j+1)*len(n)/12)); sweep[seg]=lp(n, f)[seg]
whoosh=sweep*np.sin(np.pi*np.minimum(tt/0.9,1))**2*0.8
crackle=np.zeros_like(tt)
for _ in range(40):
    p=int(rng.uniform(0.2,1.4)*SR); L=int(0.004*SR); crackle[p:p+L]+=rng.standard_normal(L)*rng.uniform(0.2,0.7)*np.exp(-np.arange(L)/40)
crackle=hp(crackle,1500)
warm=bell(440,dur,0.8)*0.35
save('ember', norm(fade(reverb(whoosh+crackle+warm,1.0,0.25),0.01,0.3),0.7))

# Nouveau stade : gong grave + scintillement qui monte.
dur=4.0; tt=t(dur)
gong=modal(98,[1,1.48,2.03,2.68,3.2,4.1],[1,0.7,0.6,0.4,0.3,0.2],[2.5,2.0,1.6,1.2,0.9,0.7],dur)*(1-np.exp(-tt/0.03))
shim=np.zeros_like(tt)
for k,f in enumerate([1318.5,1568,1975.5,2637]):
    s=int((0.4+0.25*k)*SR); b=bell(f,dur-0.4-0.25*k,1.2)*0.25; shim[s:s+len(b)]+=b
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

# Musique provisoire : nappe lente en ré mineur (Rém, Sib, Fa, Do), 8 s par accord.
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
# petite mélodie lointaine au deuxième tour
for k,(m,start) in enumerate([(74,34),(72,38),(69,42),(72,46),(74,50),(77,54),(76,58)]):
    s=int(start*SR); b=bell(hz(m),3.5,1.3)*0.25; music[s:s+len(b)]+=b
music=lp(music,2500)
music=reverb(music,3.0,0.35,2500)
L=int(SR*total); loop=music[:L].copy(); tail=music[L:]
loop[:len(tail)]+=tail[:L]
save('music', norm(loop,0.5), q=3)
print('ok')