export namespace Signature {
  export const DefaultValue = {
    size: {
      w: 1400,
      h: 250,
    },
    drawColor: '#000000',
    drawWidthPen: 2,
    drawWidthEraser: 24,
    pen: {
      lineWidth: {
        pen: 2,
        eraser: 24,
      },
    },
  } as const;

  export const DrawType = {
    Pen: 'source-over',
    Eraser: 'destination-out',
  } as const;
  export type DrawType = typeof DrawType[keyof typeof DrawType];

  export interface Control {
    Reset: () => void;
    GetImage: () => string | null;
    SetImage: (dataUrl: string | null) => Promise<boolean>;
  }

  export const InitControl = (): Control => {
    return {
      Reset: () => console.error('Reset init'),
      GetImage: () => {
        console.error('GetImage init');
        return null;
      },
      SetImage: async (dataUrl: string | null) => {
        console.error('SetImage init');
        return false;
      },
    };
  };
}
