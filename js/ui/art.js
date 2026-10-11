/**
 * Ayudas para poner ilustraciones en la interfaz como nodos (sin innerHTML).
 */

import { h } from './dom.js';
import { goodSvg } from '../render/goods-art.js';
import { svgNode } from '../render/shapes.js';

/**
 * Ilustración de un bien dentro de una caja del tamaño pedido.
 * @param {string} goodId
 * @param {number} [size=40] px
 * @param {string} [cls='goodart']
 */
export function goodArt(goodId, size = 40, cls = 'goodart') {
  return h('span', { class: cls, style: `width:${size}px;height:${size}px`, 'aria-hidden': 'true' }, svgNode(goodSvg(goodId)));
}
