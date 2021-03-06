/*global define*/
define([
        '../Core/DeveloperError'
    ], function(
        DeveloperError) {
    "use strict";

    /**
     * If element is a string, look up the element in the DOM by ID.  Otherwise return element.
     *
     * @private
     *
     * @exception {DeveloperError} Element with id "id" does not exist in the document.
     */
    var getElement = function(element) {
        if (typeof element === 'string') {
            var foundElement = document.getElementById(element);
            if (foundElement === null) {
                throw new DeveloperError('Element with id "' + element + '" does not exist in the document.');
            }
            element = foundElement;
        }
        return element;
    };

    return getElement;
});