import { Link } from "react-router-dom";

export function PaginaNoEncontrada() {
  return (
    <main className="pagina-no-encontrada">
      <p className="etiqueta">Error 404</p>
      <h1>Página no encontrada</h1>
      <p>La dirección solicitada no corresponde a una página disponible.</p>
      <Link className="boton-primario enlace-boton" to="/inicio">Volver al inicio</Link>
    </main>
  );
}
