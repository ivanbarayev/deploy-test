// EnMessages hem typeof en, hem de NoEmptyObject ile kontrol ediliyor
export type EnMessages = NoEmptyObject<typeof en>;

// Helper type: checks that T and U have the same shape, but allows any string as value
type SameShape<T, U> = {
  [K in keyof T & keyof U]: T[K] extends string
    ? U[K] extends string
      ? string
      : never
    : SameShape<T[K], U[K]>;
};
export type TranslationShape = SameShape<EnMessages, EnMessages>;

// Hiçbir key'in değeri boş obje olamaz
type NoEmptyObject<T> = {
  [K in keyof T]: T[K] extends object
    ? keyof T[K] extends never
      ? never
      : NoEmptyObject<T[K]>
    : T[K];
};

const en = {} as const;

export default en;
