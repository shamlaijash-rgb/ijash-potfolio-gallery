from pathlib import Path
from html import escape as e
import json,re
root=Path('dist');base='https://ijas-design-portfolio.shamlaijash.chatgpt.site'
projects=json.loads((root/'projects.json').read_text())
def meta(title,desc,url,img):
 return f'<title>{e(title)}</title><meta name="description" content="{e(desc,quote=True)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="{url}"><meta property="og:type" content="website"><meta property="og:site_name" content="Ijashul Haque"><meta property="og:title" content="{e(title,quote=True)}"><meta property="og:description" content="{e(desc,quote=True)}"><meta property="og:url" content="{url}"><meta property="og:image" content="{img}"><meta name="twitter:card" content="summary_large_image">'
title='Exhibition Designer Portfolio | Ijashul Haque'
desc='Ijashul Haque — Ijashul Haque’s design portfolio: exhibition booth design, event stages, 3D modelling, presentation renders and recognition trophy concepts.'
s=(root/'index.html').read_text()
s=re.sub(r'<section class="wrap search-portfolio".*?</section>','',s,flags=re.S)
s=re.sub(r'<script type="application/ld\+json">.*?</script>','',s,flags=re.S)
s=s.replace('<link rel="stylesheet" href="seo.css">','')
s=re.sub(r'<title>.*?</title>.*?(?=<meta name="theme-color")',meta(title,desc,base+'/',base+'/assets/ncms-1.webp'),s,count=1)
links=''.join(f'<li><a href="projects/{e(p["id"])}/">{e(p["title"])}</a><span>{e(p["category"])} · {e(p["status"])}</span></li>' for p in projects)
section=f'<section class="wrap search-portfolio" aria-labelledby="design-portfolio-title"><p class="eyebrow">DESIGN PORTFOLIO</p><h2 id="design-portfolio-title">Exhibition design and 3D visualization</h2><p>Explore booth layouts, branded exhibition environments, event stages, reception counters and custom recognition trophy concepts. The collection includes 3D concept renders and individually labelled photographs of installed spaces.</p><p>For event teams, design recruiters and employers reviewing exhibition designer or 3D designer portfolios, each project below offers a direct page with its visual references and description.</p><p lang="ar" dir="rtl">معرض أعمال تصميم أجنحة المعارض ومنصات الفعاليات والتصور ثلاثي الأبعاد.</p><details><summary>Browse all project pages</summary><ul class="seo-project-links">{links}</ul></details></section>'
s=s.replace('</main>',section+'</main>')
schema={'@context':'https://schema.org','@type':'CollectionPage','name':title,'description':desc,'url':base+'/','inLanguage':'en','creator':{'@type':'Person','name':'Ijashul Haque','jobTitle':'Designer'},'hasPart':[{'@type':'CreativeWork','name':p['title'],'url':base+'/projects/'+p['id']+'/','description':p['description']} for p in projects]}
s=s.replace('</head>','<link rel="stylesheet" href="seo.css"><script type="application/ld+json">'+json.dumps(schema,ensure_ascii=False).replace('</','<\\/')+'</script></head>')
(root/'index.html').write_text(s)
css='.search-portfolio{padding-top:70px;padding-bottom:70px}.search-portfolio h2{font-size:clamp(24px,4vw,42px);max-width:900px}.search-portfolio>p{max-width:850px;line-height:1.8}.search-portfolio details{margin-top:24px}.search-portfolio summary{cursor:pointer;font-size:18px}.seo-project-links{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}.seo-project-links li{padding:14px 0;border-bottom:1px solid #ffffff22}.seo-project-links a{display:block;color:#9bdedc}.seo-project-links span{display:block;font-size:12px;opacity:.7;margin-top:6px}'
(root/'seo.css').write_text(css)
pcss='*{box-sizing:border-box}body{margin:0;background:#0d1520;color:#f2f3ed;font:17px/1.7 system-ui,sans-serif}a{color:#a1e4dc;text-underline-offset:5px}header,main,footer{max-width:1100px;margin:auto;padding:28px}header{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;border-bottom:1px solid #ffffff25}header a{font-weight:700}h1{font-size:clamp(30px,5vw,60px);line-height:1.15}h2{font-size:28px}.intro{max-width:850px}.eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.15em;color:#a1e4dc}figure{margin:36px 0}img,video{display:block;width:100%;max-height:85vh;object-fit:contain;background:#121e2a;border-radius:12px}figcaption{font-size:14px;color:#bfcccf;padding-top:12px}footer{border-top:1px solid #ffffff25}.links{display:flex;gap:25px;flex-wrap:wrap}a:focus-visible{outline:3px solid #ffc99d;outline-offset:5px}@media(max-width:600px){header,main,footer{padding:20px}}'
(root/'project-pages.css').write_text(pcss)
urls=[base+'/']
for i,p in enumerate(projects):
 folder=root/'projects'/p['id'];folder.mkdir(parents=True,exist_ok=True)
 url=base+'/projects/'+p['id']+'/';urls.append(url)
 images=p.get('images',[])
 preview=base+'/'+(images[0]['src'] if images else p.get('videos',[{}])[0].get('poster','assets/ncms-1.webp'))
 media=''
 for j,a in enumerate(images):
  media+=f'<figure><img src="../../{e(a["src"],quote=True)}" alt="{e(a.get("alt",a["label"]),quote=True)}" loading="{"eager" if j==0 else "lazy"}" decoding="async"'+(f' width="{a["width"]}" height="{a["height"]}"' if a.get('width') and a.get('height') else '')+f'><figcaption>{e(a["label"])}</figcaption></figure>'
 for a in p.get('videos',[]):
  media+=f'<figure><video controls playsinline preload="none" poster="../../{e(a["poster"],quote=True)}"><source src="../../{e(a["src"],quote=True)}" type="video/mp4"></video><figcaption>{e(a["label"])}</figcaption></figure>'
 nxt=projects[(i+1)%len(projects)]
 obj={'@context':'https://schema.org','@type':'WebPage','name':p['title']+' | Ijashul Haque','description':p['description'],'url':url,'isPartOf':{'@type':'WebSite','name':'Ijashul Haque','url':base+'/'},'mainEntity':{'@type':'CreativeWork','name':p['title'],'description':p['description'],'image':[base+'/'+a['src'] for a in images]}}
 doc=f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">{meta(p["title"]+" | "+p["category"]+" Portfolio | Ijashul Haque",p["description"][:170],url,preview)}<link rel="icon" href="../../favicon.svg"><link rel="stylesheet" href="../../project-pages.css"><link rel="stylesheet" href="../../motion-studio.css"><script type="application/ld+json">{json.dumps(obj,ensure_ascii=False).replace("</","<\\/")}</script><script defer src="../../motion-studio.js"></script></head><body><header><a href="../../">IJASHUL HAQUE</a><a href="../../#work">All projects</a></header><main><p class="eyebrow">{e(p["category"])} / {e(p["status"])}</p><h1>{e(p["title"])}</h1><p class="intro">{e(p["subtitle"])}</p><p class="intro">{e(p["description"])}</p><p class="eyebrow">Exhibition and event design portfolio</p>{media}</main><footer><div class="links"><a href="../../#brief">Portfolio enquiry</a><a href="../{e(nxt["id"])}/">Next: {e(nxt["title"])}</a><a href="../../#work">Back to gallery</a></div></footer></body></html>'
 (folder/'index.html').write_text(doc)
(root/'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: '+base+'/sitemap.xml\n')
(root/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>'+e(u)+'</loc></url>' for u in urls)+'</urlset>')
print('Generated metadata, 39 project pages, sitemap and robots.txt')
