import pathlib
P=pathlib.Path('src')
css=(P/'style.css').read_text()
js='\n'.join((P/f).read_text() for f in ['content.js','core.js','student.js','staff.js','router.js'])
html=f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>LPC Learning Studio · Interactive Training</title>
<meta name="description" content="Prototype learning platform for counseling students, LPC Associates, and supervisors. Fictional data; not CE-approved.">
<meta name="theme-color" content="#19362d">
<style>{css}</style></head><body>
<div id="root"></div>
<div id="modal" class="modal" role="dialog" aria-modal="true"><div class="panel"><button class="x" data-a="close" aria-label="Close">×</button><div id="mbody"></div></div></div>
<div id="toast" class="toast" role="status" aria-live="polite"></div>
<noscript><p style="padding:20px">This prototype requires JavaScript.</p></noscript>
<script>
{js}
</script></body></html>'''
out=pathlib.Path('dist/LPC');out.mkdir(parents=True,exist_ok=True)
(out/'index.html').write_text(html)
print(len(html))
