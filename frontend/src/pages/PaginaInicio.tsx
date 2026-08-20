import { useSesion } from "../hooks/useSesion";

export function PaginaInicio() {
  const { ObjUsuario } = useSesion();
  return (
    <section className="pagina-inicio">
      <div className="encabezado-pagina">
        <p className="etiqueta">Panel principal</p>
        <h1>Bienvenido, {ObjUsuario?.nombreCompleto.split(" ")[0]}</h1>
        <p>Bienvenido al sistema de administración y trazabilidad de la Granja El Chiflón.</p>
      </div>
      <div className="tarjeta-bienvenida">
        <div>
          <span className="tarjeta-icono" aria-hidden="true">✓</span>
          <div>
            <h2>Sesión activa</h2>
            <p>Su acceso fue verificado correctamente por el servidor.</p>
          </div>
        </div>
        <dl>
          <div><dt>Usuario</dt><dd>{ObjUsuario?.nombreUsuario}</dd></div>
          <div><dt>Rol</dt><dd>{ObjUsuario?.rol.nombre}</dd></div>
          <div><dt>Permisos activos</dt><dd>{ObjUsuario?.permisos.length ?? 0}</dd></div>
        </dl>
      </div>
      <div className="tarjeta-proximos">
        <p className="etiqueta">Próximos módulos</p>
        <h2>La fundación está lista para crecer</h2>
        <p>Los módulos operativos se habilitarán gradualmente conservando esta navegación y sus permisos.</p>
      </div>
    </section>
  );
}
