/**
 * El traductor de Chrome (y algunas extensiones) cambia los nodos de texto
 * de la página por otros suyos sin que React lo sepa. Cuando React va
 * después a quitar o mover uno de esos nodos, ya no está donde lo dejó y
 * `removeChild`/`insertBefore` lanzan NotFoundError, que tumba la página
 * entera (visto en / el 14/10/2026). Es el parche que propone el propio
 * equipo de React (facebook/react#11538): si el nodo ya no es hijo de este
 * padre, se ignora la operación en vez de lanzar. Va como script en línea
 * en <head> para que esté puesto antes de que React hidrate.
 */
export const DOM_MUTATION_GUARD_SCRIPT = `(function(){try{if(typeof Node!=="function"||!Node.prototype)return;var r=Node.prototype.removeChild;Node.prototype.removeChild=function(c){if(c.parentNode!==this)return c;return r.apply(this,arguments)};var i=Node.prototype.insertBefore;Node.prototype.insertBefore=function(n,ref){if(ref&&ref.parentNode!==this)return n;return i.apply(this,arguments)}}catch(e){}})();`;
