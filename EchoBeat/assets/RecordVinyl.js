import React, { forwardRef } from 'react';
import SvgIcon from '../assets/record-vinyl.svg'; // Importa el SVG como componente

// Envolvemos el SVG con forwardRef
const RecordVinyl = forwardRef((props, ref) => (
  <SvgIcon ref={ref} {...props} />
));

export default RecordVinyl;
