// function getRandomNumber() {
//     return Math.floor(Math.random() * 8);
// }

// function createRandomVector() {
//     const x = getRandomNumber();
//     const y = getRandomNumber();
//     const z = getRandomNumber();

//     const a = getRandomNumber();
//     const b = getRandomNumber();
//     const c = getRandomNumber();

//     return {
//         position: { x, y, z },
//         direction: { a, b, c },
//     };
// }

// function calculateVectorEquation(vector, val) {
//     const { x, y, z } = vector.position;
//     const { a, b, c } = vector.direction;
//     const coefficients = ["p", "q"];
//     const vectorCoefficient = coefficients[val - 1];
//     console.log(`l${val}: r = (${x},${y},${z}) + ${vectorCoefficient}(${a},${b},${c})`)
//     return (`l${val}: r = (${x},${y},${z}) + ${vectorCoefficient}(${a},${b},${c})`);
// }

// function doVectorsIntersect(vector1, vector2) {
//     var vector1Position = [vector1.position.x, vector1.position.y, vector1.position.z];
//     var vector1Direction = [vector1.direction.a, vector1.direction.b, vector1.direction.c];

//     var vector2Position = [vector2.position.x, vector2.position.y, vector2.position.z];
//     var vector2Direction = [vector2.direction.a, vector2.direction.b, vector2.direction.c];

//     var equs = createEquations(vector1Direction, vector2Direction, vector1Position, vector2Position);

//     var isParallel = areVectorsParallel(vector1Direction, vector2Direction);

//     if (isParallel) {
//         console.log("These vectors are parallel and do not intersect.");
//         return false;
//     } else {
//         var PandQ = findPandQ(equs);
//         if (checkPandQs(PandQ, equs)) {
//            console.log("p = " + PandQ[0] + " & q = " + PandQ[1]);
//             return true;
//         } else {
//             console.log("These vectors are skew.");
//             return false;
//         }
//     }
// }

// function createEquations(v1, v2, p1, p2) {
//     var equs = [];

//     for (var i = 0; i <= 2; i++) {
//         equs[i] = [];
//         equs[i][0] = v1[i];
//         equs[i][1] = -1 * v2[i];
//         equs[i][2] = p2[i] - p1[i];
//     }
//     return equs;
// }

// function areVectorsParallel(v1, v2) {
//     var finalCheck = false;
//     var checks = [];

//     for (var i = 0; i <= 2; i++) {
//         if (v2[i] == 0) {
//             checks[i] = Infinity;
//         } else if (v1[i] == 0) {
//             checks[i] = 1;
//         } else {
//             checks[i] = v1[i] / v2[i];
//         }
//     }
//     if (checks[0] == checks[1] && checks[1] == checks[2]) {
//         finalCheck = true;
//     }

//     return finalCheck;
// }

// function findPandQ(equs) {
//     var D, Dq, Dp;
//     var PandQ = [];

//     D = (equs[0][0] * equs[1][1]) - (equs[1][0] * equs[0][1]);
//     Dp = (equs[0][2] * equs[1][1]) - (equs[0][1] * equs[1][2]);
//     Dq = (equs[0][0] * equs[1][2]) - (equs[0][2] * equs[1][0]);
//     try {
//         PandQ[0] = Dp / D;
//         PandQ[1] = Dq / D;
//     } catch (ex) {
//         throw ex;
//     }

//     return PandQ;
// }

// function checkPandQs(PandQ, equs) {
//     var check = false;
//     var equation = (equs[2][0] * PandQ[0]) + (equs[2][1] * PandQ[1]);
//     if (equation == equs[2][2]) {
//         check = true;
//     }
//     return check;
// }

// function findIntersection(v1, p1, v2, p2, PandQ) {
//     var intersection = [];

//     intersection[0] = [];
//     intersection[1] = [];
//     for (var i = 0; i <= 2; i++) {
//         intersection[0][i] = p1[i] + PandQ[0] * v1[i];
//     }
//     for (var i = 0; i <= 2; i++) {
//         intersection[1][i] = p2[i] + PandQ[1] * v2[i];
//     }

//     var check = true;

//     for (var j = 0; j <= 2; j++) {
//         if (intersection[0][j] != intersection[1][j]) {
//             console.log("Error");
//             check = false;
//         }
//     }
//     if (check == true) {
//         return intersection;
//     }
// }

// function calculateCoordinates(vector1, vector2) {
//     const PandQ = findPandQ(createEquations(
//         [vector1.direction.a, vector1.direction.b, vector1.direction.c],
//         [vector2.direction.a, vector2.direction.b, vector2.direction.c],
//         [vector1.position.x, vector1.position.y, vector1.position.z],
//         [vector2.position.x, vector2.position.y, vector2.position.z]
//     ));

//     const intersection = findIntersection(
//         [vector1.direction.a, vector1.direction.b, vector1.direction.c],
//         [vector1.position.x, vector1.position.y, vector1.position.z],
//         [vector2.direction.a, vector2.direction.b, vector2.direction.c],
//         [vector2.position.x, vector2.position.y, vector2.position.z],
//         PandQ
//     );

//     for (var i = 0; i <=2; i++){
//         if (typeof (intersection[0][i]) === 'number' && !Number.isInteger(intersection[0][i])) {
//             intersection[0][i] = parseFloat(intersection[0][i].toFixed(2));
//         }
//     }
//     const formattedCoordinates = `(${intersection[0][0]}, ${intersection[0][1]}, ${intersection[0][2]})`;

//     return formattedCoordinates;
// }

// module.exports = {
//     getIntersectingVectorsandCoordinates: function() {
//         let vector1, vector2;

//         do {
//             vector1 = createRandomVector();
//             vector2 = createRandomVector();
//         } while (!doVectorsIntersect(vector1, vector2));

//         const vector1Equation = calculateVectorEquation(vector1, 1);
//         const vector2Equation = calculateVectorEquation(vector2, 2);
//         const coordinates = calculateCoordinates(vector1, vector2);

//         return { vector1: vector1Equation, vector2: vector2Equation, coordinates: coordinates };
//     },

// };

function getRandomNumber() {
    return Math.floor(Math.random() * 8);
}

function createRandomVector() {
    const x = getRandomNumber();
    const y = getRandomNumber();
    const z = getRandomNumber();

    const a = getRandomNumber();
    const b = getRandomNumber();
    const c = getRandomNumber();

    return {
        position: { x, y, z },
        direction: { a, b, c },
    };
}

function calculateVectorEquation(vector, val) {
    const { x, y, z } = vector.position;
    const { a, b, c } = vector.direction;
    const coefficients = ["p", "q"];
    const vectorCoefficient = coefficients[val - 1];
    console.log(`l${val}: r = (${x},${y},${z}) + ${vectorCoefficient}(${a},${b},${c})`)
    return (`l${val}: r = (${x},${y},${z}) + ${vectorCoefficient}(${a},${b},${c})`);
}

function doVectorsIntersect(vector1, vector2) {
    var vector1Position = [vector1.position.x, vector1.position.y, vector1.position.z];
    var vector1Direction = [vector1.direction.a, vector1.direction.b, vector1.direction.c];

    var vector2Position = [vector2.position.x, vector2.position.y, vector2.position.z];
    var vector2Direction = [vector2.direction.a, vector2.direction.b, vector2.direction.c];

    var equs = createEquations(vector1Direction, vector2Direction, vector1Position, vector2Position);

    var isParallel = areVectorsParallel(vector1Direction, vector2Direction);

    if (isParallel) {
        console.log("These vectors are parallel and do not intersect.");
        return false;
    } else {
        var PandQ = findPandQ(equs);
        if (checkPandQs(PandQ, equs)) {
            console.log("p = " + PandQ[0] + " & q = " + PandQ[1]);
            return true;
        } else {
            console.log("These vectors are skew.");
            return false;
        }
    }
}

function createEquations(v1, v2, p1, p2) {
    var equs = [];

    for (var i = 0; i <= 2; i++) {
        equs[i] = [];
        equs[i][0] = v1[i];
        equs[i][1] = -1 * v2[i];
        equs[i][2] = p2[i] - p1[i];
    }
    return equs;
}

function areVectorsParallel(v1, v2) {
    var finalCheck = false;
    var checks = [];

    for (var i = 0; i <= 2; i++) {
        if (v2[i] == 0) {
            checks[i] = Infinity;
        } else if (v1[i] == 0) {
            checks[i] = 1;
        } else {
            checks[i] = v1[i] / v2[i];
        }
    }
    if (checks[0] == checks[1] && checks[1] == checks[2]) {
        finalCheck = true;
    }

    return finalCheck;
}

function findPandQ(equs) {
    var D, Dq, Dp;
    var PandQ = [];

    D = (equs[0][0] * equs[1][1]) - (equs[1][0] * equs[0][1]);
    Dp = (equs[0][2] * equs[1][1]) - (equs[0][1] * equs[1][2]);
    Dq = (equs[0][0] * equs[1][2]) - (equs[0][2] * equs[1][0]);
    try {
        PandQ[0] = Dp / D;
        PandQ[1] = Dq / D;
    } catch (ex) {
        throw ex;
    }

    return PandQ;
}

function checkPandQs(PandQ, equs) {
    var check = false;
    var equation = (equs[2][0] * PandQ[0]) + (equs[2][1] * PandQ[1]);
    if (equation == equs[2][2]) {
        check = true;
    }
    return check;
}

function findIntersection(v1, p1, v2, p2, PandQ) {
    var intersection = [];

    intersection[0] = [];
    intersection[1] = [];
    for (var i = 0; i <= 2; i++) {
        intersection[0][i] = p1[i] + PandQ[0] * v1[i];
    }
    for (var i = 0; i <= 2; i++) {
        intersection[1][i] = p2[i] + PandQ[1] * v2[i];
    }

    var check = true;

    for (var j = 0; j <= 2; j++) {
        if (intersection[0][j] != intersection[1][j]) {
            console.log("Error");
            check = false;
        }
    }
    if (check == true) {
        return intersection;
    }
}

function calculateCoordinates(vector1, vector2) {
    const PandQ = findPandQ(createEquations(
        [vector1.direction.a, vector1.direction.b, vector1.direction.c],
        [vector2.direction.a, vector2.direction.b, vector2.direction.c],
        [vector1.position.x, vector1.position.y, vector1.position.z],
        [vector2.position.x, vector2.position.y, vector2.position.z]
    ));

    const intersection = findIntersection(
        [vector1.direction.a, vector1.direction.b, vector1.direction.c],
        [vector1.position.x, vector1.position.y, vector1.position.z],
        [vector2.direction.a, vector2.direction.b, vector2.direction.c],
        [vector2.position.x, vector2.position.y, vector2.position.z],
        PandQ
    );

    for (var i = 0; i <=2; i++){
        if (typeof (intersection[0][i]) === 'number' && !Number.isInteger(intersection[0][i])) {
            intersection[0][i] = parseFloat(intersection[0][i].toFixed(2));
        }
    }
    const formattedCoordinates = `(${intersection[0][0]}, ${intersection[0][1]}, ${intersection[0][2]})`;

    return formattedCoordinates;
}

module.exports = {
    getIntersectingVectorsandCoordinates: function() {
        function tryCreateVectors() {
            const vector1 = createRandomVector();
            const vector2 = createRandomVector();

            if (!doVectorsIntersect(vector1, vector2)) {
                return tryCreateVectors();
            }

            const vector1Equation = calculateVectorEquation(vector1, 1);
            const vector2Equation = calculateVectorEquation(vector2, 2);
            const coordinates = calculateCoordinates(vector1, vector2);

            return { vector1: vector1Equation, vector2: vector2Equation, coordinates: coordinates };
        }

        return tryCreateVectors();
    },
};
