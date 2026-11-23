import numpy as np, soundfile as sf, sys
from scipy.signal import welch
y,sr=sf.read(sys.argv[1]); y=y if y.ndim==1 else y.mean(1)
f,P=welch(y,sr,nperseg=8192)
cs=[63,125,250,500,1000,2000,4000,8000,12000]
L=[10*np.log10(P[(f>=c/2**0.5)&(f<c*2**0.5)].sum()) for c in cs]
ref=L[3]; tgt=[-12,-4,0,0,-5,-11,-16,-21,-26]
print(sys.argv[1]," ".join(f"{c}:{l-ref:+.0f}({l-ref-g:+.0f})" for c,l,g in zip(cs,L,tgt)))
