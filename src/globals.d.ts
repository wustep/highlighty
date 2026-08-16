interface PickerColor {
  hex: string;
}

interface PickerOptions {
  alpha: boolean;
  color: string;
  parent: HTMLElement;
  popup: string;
  onDone(color: PickerColor): void;
}

declare class Picker {
  constructor(options: PickerOptions);
  setOptions(options: Partial<PickerOptions>): void;
}
