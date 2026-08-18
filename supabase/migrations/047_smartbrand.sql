-- smartbrand: o manual da marca virado documento vivo.
--
-- `smartbrand` guarda o markdown renderizado a partir da extração do manual —
-- só informação real; o que o manual não diz fica em branco.
-- `smartbrand_gaps` é a lista dessas lacunas, para o painel mostrar e o
-- Copiloto oferecer ajuda campo a campo, sem precisar reprocessar o texto.

alter table brand_books
  add column if not exists smartbrand      text,
  add column if not exists smartbrand_gaps jsonb default '[]'::jsonb;

comment on column brand_books.smartbrand is
  'Documento markdown gerado do manual. Apenas informação extraída — nada inventado.';
comment on column brand_books.smartbrand_gaps is
  'Campos que o manual não cobriu: [{ secao, campo, rotulo }]. O Copiloto preenche sob demanda.';
