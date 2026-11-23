import numpy as np, subprocess, soundfile as sf, sys
from scipy.signal import stft, istft
from scipy.ndimage import uniform_filter
sr=48000
a=np.frombuffer(subprocess.run(["ffmpeg","-v","error","-i","raw.mp4","-ac","1","-ar",str(sr),"-f","s16le","-"],capture_output=True).stdout,np.int16).astype(np.float32)/32768
N=2048;H=512
def proc(x, alpha=1.6, floor_db=-16, pct=12):
    f,t,X=stft(x,sr,nperseg=N,noverlap=N-H)
    P=np.abs(X)**2
    noise=np.percentile(P,pct,axis=1,keepdims=True)*1.0
    # smooth noise across freq a bit
    noise=uniform_filter(noise,size=(5,1))
    snr_post=P/(noise+1e-12)
    # decision-directed a-priori SNR
    G=np.ones_like(P); prev=np.ones(P.shape[0])
    xi_prev=np.zeros(P.shape[0])
    for i in range(P.shape[1]):
        xi=0.96*(prev**2)*snr_post[:,max(i-1,0)]+0.04*np.maximum(snr_post[:,i]-1,0)
        g=xi/(xi+alpha)
        g=np.maximum(g,10**(floor_db/20))
        G[:,i]=g; prev=g
    G=uniform_filter(G,size=(3,3))
    _,y=istft(X*G,sr,nperseg=N,noverlap=N-H)
    return y[:len(x)]
cut=int(11.5*sr)
y=np.concatenate([proc(a[:cut]),proc(a[cut:])])
sf.write("voice_dn.wav",y,sr,subtype="FLOAT")
