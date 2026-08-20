declare global {
  namespace Express {
    interface Request {
      ObjAutenticacion?: {
        IntUsuarioId: number;
        IntSesionId: number;
        StrTokenHash: string;
        ArrPermisos: string[];
      };
    }
  }
}

export {};
