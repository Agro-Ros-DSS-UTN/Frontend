import styled from 'styled-components';

// Puerto directo del checkbox con animación de flip 3D que pasó el usuario
// (styled-components real). Única adaptación respecto al original: el demo
// posicionaba `.cbx` con `position: absolute; top: 50%; left: 50%` para
// centrarlo solo en el centro de la pantalla — acá se usa inline, así que
// se cambia a `position: relative` para que se acomode en el flujo normal
// del formulario; y pasa a ser CONTROLADO (`checked`/`onChange`) en vez de
// `defaultChecked`, para poder usarlo dentro de un form real. El resto
// (estructura, selectores, colores de base) se mantiene igual, solo
// cambiando el azul original (#0b76ef) por el verde de marca (#16a34a).
const StyledWrapper = styled.div`
  .cbx {
    -webkit-perspective: 20;
    perspective: 20;
    position: relative;
    display: inline-block;
    border: 2px solid #e8e8eb;
    background: #e8e8eb;
    border-radius: 4px;
    transform: translate3d(0, 0, 0);
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .cbx:hover {
    border-color: #16a34a;
  }

  .flip {
    display: block;
    transition: all 0.4s ease;
    transform-style: preserve-3d;
    position: relative;
    width: 20px;
    height: 20px;
  }

  .checkmark input {
    display: none;
  }

  .checkmark input:checked ~ .flip {
    transform: rotateY(180deg);
  }

  .front,
  .back {
    backface-visibility: hidden;
    position: absolute;
    top: 0;
    left: 0;
    width: 20px;
    height: 20px;
    border-radius: 2px;
  }

  .front {
    background: #fff;
    z-index: 1;
  }

  .back {
    transform: rotateY(180deg);
    background: #16a34a;
    text-align: center;
    color: #fff;
    line-height: 20px;
    box-shadow: 0 0 0 1px #16a34a;
  }

  .back svg {
    margin-top: 3px;
    fill: none;
  }

  .back svg path {
    stroke: #fff;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
`;

export const FlipCheckbox = ({ id, checked, onChange }) => {
  return (
    <StyledWrapper>
      <label htmlFor={id} className="cbx">
        <div className="checkmark">
          <input checked={checked} onChange={onChange} type="checkbox" id={id} />
          <div className="flip">
            <div className="front" />
            <div className="back">
              <svg viewBox="0 0 16 14" height={14} width={16}>
                <path d="M2 8.5L6 12.5L14 1.5" />
              </svg>
            </div>
          </div>
        </div>
      </label>
    </StyledWrapper>
  );
};

export default FlipCheckbox;
