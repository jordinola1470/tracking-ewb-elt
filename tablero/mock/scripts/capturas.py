# Genera una captura de cada vista del tablero en screenshots/.
# Requiere: pip install playwright && playwright install chromium ; y haber corrido `npm run build`.
import pathlib
from playwright.sync_api import sync_playwright

raiz = pathlib.Path(__file__).resolve().parent.parent
url = (raiz / "index.html").as_uri()
salida = raiz / "screenshots"; salida.mkdir(exist_ok=True)

with sync_playwright() as p:
    nav = p.chromium.launch()
    for tema in ["light"]:
        pag = nav.new_page(viewport={"width": 1366, "height": 900}, device_scale_factor=1.5, color_scheme=tema)
        errores = []
        pag.on("pageerror", lambda e: errores.append(str(e)))
        pag.on("console", lambda m: errores.append(m.text) if m.type == "error" else None)
        pag.goto(url); pag.wait_for_timeout(800)
        pag.screenshot(path=str(salida / "1_analitica.png"), full_page=True)
        pag.select_option(".dash-select", "2023"); pag.wait_for_timeout(500)
        pag.screenshot(path=str(salida / "2_analitica_filtro_2023.png"), full_page=True)
        pag.click("button[data-tab=perfiles]"); pag.wait_for_timeout(600)
        pag.screenshot(path=str(salida / "3_perfiles.png"), full_page=True)
        pag.click("tbody tr[data-key='D-0006']"); pag.wait_for_timeout(400)
        # La ficha se captura a ancho completo para que se vean todas sus columnas.
        est = pag.add_style_tag(content=".mk-perf{grid-template-columns:1fr !important}"); pag.wait_for_timeout(500)
        pag.locator("#ficha-docente").screenshot(path=str(salida / "4_ficha_docente.png"))
        est.evaluate("e => e.remove()"); pag.wait_for_timeout(400)
        pag.fill(".mk-search", "Colegio Ejemplo 07"); pag.wait_for_timeout(400)
        pag.screenshot(path=str(salida / "5_perfiles_busqueda.png"), full_page=True)
        movil = nav.new_page(viewport={"width": 400, "height": 860}, device_scale_factor=2)
        movil.goto(url); movil.wait_for_timeout(800)
        movil.screenshot(path=str(salida / "6_analitica_movil.png"), full_page=True)
        print("errores:", errores or "ninguno")
    nav.close()
