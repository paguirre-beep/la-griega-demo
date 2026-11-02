import pathlib
s=pathlib.Path('src')
html=(s/'shell.html').read_text()
css=(s/'style.css').read_text()
js='\n'.join((s/f).read_text() for f in ['core.js','ui.js','ui2.js','gri.js','onboard.js','tour.js','app.js'])
js=js.replace('__LOGO__',(s/'logo.b64').read_text().strip())
out=html.replace('/*CSS*/',css).replace('/*JS*/',js)
pathlib.Path('dist').mkdir(exist_ok=True)
# artifact version (sin doctype/head) y versión standalone para Vercel
pathlib.Path('dist/la-griega.html').write_text(out)
full='<!doctype html>\n<html lang="es-AR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'+out.replace('<div class="app">','</head>\n<body>\n<div class="app">',1)+'\n</body>\n</html>\n'
pathlib.Path('dist/index.html').write_text(full)
print(len(out))
