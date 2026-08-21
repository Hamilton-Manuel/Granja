export function InsigniaEstado({ StrEstado }: { StrEstado: string }) {
  const StrTexto = StrEstado.charAt(0) + StrEstado.slice(1).toLowerCase();
  return <span className={`insignia-estado insignia-estado--${StrEstado.toLowerCase()}`}>{StrTexto}</span>;
}
