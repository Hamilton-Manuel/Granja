interface DatoBarra { StrEtiqueta:string;IntValor:number;StrDetalle?:string }
export function GraficaBarras({ StrTitulo, ArrDatos }: { StrTitulo:string;ArrDatos:DatoBarra[] }) {
  const IntMaximo=Math.max(0,...ArrDatos.map(Obj=>Obj.IntValor)),BoolConDatos=ArrDatos.some(Obj=>Obj.IntValor>0);
  return <section className="dashboard-panel dashboard-grafica" aria-label={StrTitulo}><h2>{StrTitulo}</h2>{!BoolConDatos&&<p className="dashboard-vacio">Sin registros</p>}<div className="dashboard-barras">{ArrDatos.map(Obj=><div className="dashboard-barra-fila" key={Obj.StrEtiqueta}><div className="dashboard-barra-etiqueta"><span>{Obj.StrEtiqueta}</span><strong>{Obj.IntValor}</strong></div><div className="dashboard-barra-pista" aria-hidden="true"><span style={{width:`${IntMaximo===0?0:Math.max(3,(Obj.IntValor/IntMaximo)*100)}%`}}/></div>{Obj.StrDetalle&&<small>{Obj.StrDetalle}</small>}</div>)}</div></section>;
}
