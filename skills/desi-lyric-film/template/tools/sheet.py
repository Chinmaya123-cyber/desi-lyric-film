import sys, glob, os
from PIL import Image, ImageDraw
files = sorted(sys.argv[2:]); W,H,C = 480,300,5
R = (len(files)+C-1)//C
sheet = Image.new('RGB',(W*C,H*R),(60,60,60)); d = ImageDraw.Draw(sheet)
for i,f in enumerate(files):
    im = Image.open(f).convert('RGBA'); im.thumbnail((W,H-20))
    bg = Image.new('RGBA', im.size, (90,90,90,255)); bg.alpha_composite(im)
    x,y = (i%C)*W,(i//C)*H; sheet.paste(bg.convert('RGB'),(x,y+20)); d.text((x+4,y+4),os.path.basename(f),fill=(255,255,255))
sheet.save(sys.argv[1], quality=88)
