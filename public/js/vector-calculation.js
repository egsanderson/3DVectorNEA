const nerdamer = require('nerdamer/all');

class Vector {
    constructor() {
        this.position = {
            x: this.getRandomNumber(),
            y: this.getRandomNumber(),
            z: this.getRandomNumber(),
        };

        this.direction = {
            a: this.getRandomNumber(),
            b: this.getRandomNumber(),
            c: this.getRandomNumber(),
        };

        this.scalar = null;
    }

    getRandomNumber() {
        return Math.floor(Math.random() * 8);
    }
}

class DistanceVector extends Vector {
    constructor() {
        super();
    }

    generateRandomPoint() {
        return {
            x: this.getRandomNumber(),
            y: this.getRandomNumber(),
            z: this.getRandomNumber(),
        };
    }
}

class VectorOperations {
    static createEquations(v1, v2, p1, p2) {
        const equs = [];

        for (let i = 0; i <= 2; i++) {
            equs[i] = [];
            equs[i][0] = v1[i];
            equs[i][1] = -1 * v2[i];
            equs[i][2] = p2[i] - p1[i];
        }

        return equs;
    }

    static areVectorsParallel(v1, v2) {
        const checks = v2.map((value, i) => {
            if (value === 0) {
                return Infinity;
            } else if (v1[i] === 0) {
                return 1;
            } else {
                return v1[i] / value;
            }
        });

        return checks.every((value) => value === checks[0]);
    }

    static calculateScalars(vector1, vector2, equs) {
        const D = equs[0][0] * equs[1][1] - equs[1][0] * equs[0][1];
        const Dp = equs[0][2] * equs[1][1] - equs[0][1] * equs[1][2];
        const Dq = equs[0][0] * equs[1][2] - equs[0][2] * equs[1][0];

        try {
            vector1.scalar = Dp / D;
            vector2.scalar = Dq / D;
        } catch (ex) {
            throw ex;
        }
    }

    static checkScalars(vector1, vector2, equs) {
        const equation =
            equs[2][0] * vector1.scalar + equs[2][1] * vector2.scalar;

        return equation === equs[2][2];
    }

    static formatVector(vector, Coeff, front) {
        const { x, y, z } = vector.position;
        const { a, b, c } = vector.direction;
        const scalarCoeff = Coeff
        return `${front}r = (${x}, ${y}, ${z}) + ${scalarCoeff}(${a}, ${b}, ${c})`;
    }

}

class IntersectionVectorOperations extends VectorOperations {
    static findIntersection(v1, p1, v2, p2, scalar) {
        const intersection = [[], []];

        for (let i = 0; i <= 2; i++) {
            intersection[0][i] = p1[i] + scalar[0] * v1[i];
            intersection[1][i] = p2[i] + scalar[1] * v2[i];
        }

        const check = intersection[0].every(
            (value, j) => value === intersection[1][j]
        );

        if (!check) {
            console.log("Error");
            return null;
        }

        return intersection;
    }
    
    static calculateCoordinates(vector1, vector2, scalar) {
        const intersection = IntersectionVectorOperations.findIntersection(
            [vector1.direction.a, vector1.direction.b, vector1.direction.c],
            [vector1.position.x, vector1.position.y, vector1.position.z],
            [vector2.direction.a, vector2.direction.b, vector2.direction.c],
            [vector2.position.x, vector2.position.y, vector2.position.z],
            [vector1.scalar, vector2.scalar]
        );

        for (let i = 0; i <= 2; i++) {
            if (
                typeof intersection[0][i] === "number" &&
                !Number.isInteger(intersection[0][i])
            ) {
                intersection[0][i] = parseFloat(
                    intersection[0][i].toFixed(2)
                );
            }
        }

        return `(${intersection[0][0]}, ${intersection[0][1]}, ${intersection[0][2]})`;
    }

    static doVectorsIntersect(vector1, vector2) {
        const vector1Position = [
            vector1.position.x,
            vector1.position.y,
            vector1.position.z,
        ];
        const vector1Direction = [
            vector1.direction.a,
            vector1.direction.b,
            vector1.direction.c,
        ];

        const vector2Position = [
            vector2.position.x,
            vector2.position.y,
            vector2.position.z,
        ];
        const vector2Direction = [
            vector2.direction.a,
            vector2.direction.b,
            vector2.direction.c,
        ];

        const equs = VectorOperations.createEquations(
            vector1Direction,
            vector2Direction,
            vector1Position,
            vector2Position
        );

        const isParallel = VectorOperations.areVectorsParallel(
            vector1Direction,
            vector2Direction
        );

        if (isParallel) {
            console.log("These vectors are parallel and do not intersect.");
            return false;
        } else {
            VectorOperations.calculateScalars(vector1, vector2, equs);

            if (VectorOperations.checkScalars(vector1, vector2, equs)) {
                console.log(`Scalar for vector1 (p) = ${vector1.scalar}`);
                console.log(`Scalar for vector2 (q) = ${vector2.scalar}`);
                return true;
            } else {
                console.log("These vectors are skew.");
                return false;
            }
        }
    }

    static calculateVectorEquation(vector, val) {
        const { x, y, z } = vector.position;
        const { a, b, c } = vector.direction;
        const vectorCoefficient = val === 1 ? "p" : "q";
        console.log(`l${val}: r = (${x},${y},${z}) + ${vectorCoefficient}(${a},${b},${c})`);
        return `l${val}: r = (${x},${y},${z}) + ${vectorCoefficient}(${a},${b},${c})`;
    }

    static getIntersectingVectorsAndCoordinates() {
        function tryCreateVectors() {
            const vector1 = new Vector();
            const vector2 = new Vector();

            if (!IntersectionVectorOperations.doVectorsIntersect(vector1, vector2)) {
                return tryCreateVectors();
            }

            const vector1Equation = IntersectionVectorOperations.calculateVectorEquation(vector1, 1);
            const vector2Equation = IntersectionVectorOperations.calculateVectorEquation(vector2, 2);
            const coordinates = IntersectionVectorOperations.calculateCoordinates(vector1, vector2, [vector1.scalar, vector2.scalar]);

            return { vector1: vector1Equation, vector2: vector2Equation, coordinates: coordinates };
        }

        return tryCreateVectors();
    }

}


class DistanceVectorOperations extends VectorOperations {
    calculateScalar(vector) {
        const DisVect = new DistanceVector()
        const point = DisVect.generateRandomPoint();
        var p;
        const lineDirection = [
            vector.direction.a,
            vector.direction.b,
            vector.direction.c,
        ];
        const linePosition = [
            vector.position.x,
            vector.position.y,
            vector.position.z,
        ];

        const OB = [
            "(" + linePosition[0] + " + p * " + lineDirection[0] + ")",
            "(" + linePosition[1] + " + p * " + lineDirection[1] + ")",
            "(" + linePosition[2] + " + p * " + lineDirection[2] + ")"
        ];

        const AB = [
            "(" + OB[0] + " - " + point.x + ")",
            "(" + OB[1] + " - " + point.y + ")",
            "(" + OB[2] + " - " + point.z + ")"
        ];

        const scalarProduct = [
            "(" + AB[0] + " * " + lineDirection[0] + ")",
            "(" + AB[1] + " * " + lineDirection[1] + ")",
            "(" + AB[2] + " * " + lineDirection[2] + ")"
        ];
    
        console.log("Equating scalar product to 0 and solving for p:");
        const equation = scalarProduct.join(" + ") + " = 0";

        var p = nerdamer.solve(equation, 'p');
        console.log(p.toString)

        const simplifyAndEvaluate = (expression) => {
            try {
                const simplified = nerdamer(expression).evaluate().text();
                const result = eval(simplified);
                return !isNaN(result) ? result : NaN;
            } catch (error) {
                console.error(`Error evaluating expression: ${expression}`);
                return NaN;
            }
        };
        
        const pointOnLine = {
            x: simplifyAndEvaluate(`${linePosition[0]} + ${p.toString()} * ${lineDirection[0]} - ${point.x}`),
            y: simplifyAndEvaluate(`${linePosition[1]} + ${p.toString()} * ${lineDirection[1]} - ${point.y}`),
            z: simplifyAndEvaluate(`${linePosition[2]} + ${p.toString()} * ${lineDirection[2]} - ${point.z}`),
        };

        return {
            scalar: p,
            point: point,
            pointOnLine: pointOnLine
        };
    }

    createEquationsDistance(vector1, vector2) {
        const lineDirection1 = [
            vector1.direction.a,
            vector1.direction.b,
            vector1.direction.c,
        ];
        const linePosition1 = [
            vector1.position.x,
            vector1.position.y,
            vector1.position.z,
        ];

        const lineDirection2 = [
            vector2.direction.a,
            vector2.direction.b,
            vector2.direction.c,
        ];
        const linePosition2 = [
            vector2.position.x,
            vector2.position.y,
            vector2.position.z,
        ];

        const OP = [
            "(" + linePosition1[0] + " + p * " + lineDirection1[0] + ")",
            "(" + linePosition1[1] + " + p * " + lineDirection1[1] + ")",
            "(" + linePosition1[2] + " + p * " + lineDirection1[2] + ")"
        ];

        const OQ = [
            "(" + linePosition2[0] + " + q * " + lineDirection2[0] + ")",
            "(" + linePosition2[1] + " + q * " + lineDirection2[1] + ")",
            "(" + linePosition2[2] + " + q * " + lineDirection2[2] + ")"
        ];

        const PQ = [
            "(" + OQ[0] + " - " + OP[0] + ")",
            "(" + OQ[1] + " - " + OP[1] + ")",
            "(" + OQ[2] + " - " + OP[2] + ")",
        ];

        const scalarProduct1 = [
            "(" + PQ[0] + " * " + lineDirection1[0] + ")",
            "(" + PQ[1] + " * " + lineDirection1[1] + ")",
            "(" + PQ[2] + " * " + lineDirection1[2] + ")",
        ];

        const scalarProduct2 = [
            "(" + PQ[0] + " * " + lineDirection2[0] + ")",
            "(" + PQ[1] + " * " + lineDirection2[1] + ")",
            "(" + PQ[2] + " * " + lineDirection2[2] + ")",
        ];

        const equation1 = scalarProduct1.join(" + ")  + " = 0";
        const equation2 = scalarProduct2.join(" + ")  + " = 0";

        var solutions = nerdamer.solveEquations([equation1, equation2],);

        console.log(solutions);
        const roundedSolutions = solutions.map(([variable, value]) => [variable, parseFloat(value.toFixed(3))]);

        const p = parseFloat(roundedSolutions.find(([variable]) => variable === 'p')[1].toFixed(3));
        const q = parseFloat(roundedSolutions.find(([variable]) => variable === 'q')[1].toFixed(3));
        console.log(p)
        console.log(q)

        const simplifyAndEvaluate = (expression) => {
            try {
                const simplified = nerdamer(expression).evaluate().text();
                const result = eval(simplified);
                return !isNaN(result) ? result : NaN;
            } catch (error) {
                console.error(`Error evaluating expression: ${expression}`);
                return NaN;
            }
        };
        const expresssions = [
            (`( ${linePosition2[0]} + ${p.toString()} * ${lineDirection2[0]} ) - ( ${linePosition1[0]} + ${q.toString()} * ${lineDirection1[0]}  )`),
            (`( ${linePosition2[1]} + ${p.toString()} * ${lineDirection2[1]} ) - ( ${linePosition1[1]} + ${q.toString()} * ${lineDirection1[1]}  )`),
            (`( ${linePosition2[2]} + ${p.toString()} * ${lineDirection2[2]} ) - ( ${linePosition1[2]} + ${q.toString()} * ${lineDirection1[2]}  )`),
        ]
        const distanceVector = {
            x: simplifyAndEvaluate(expresssions[0]),
            y: simplifyAndEvaluate(expresssions[1]),
            z: simplifyAndEvaluate(expresssions[2]),
        };
        console.log(distanceVector)
        return {
            distanceVector: distanceVector
        }
    }

    calculateShortestDistanceToPoint(vector) {
        const result = this.calculateScalar(vector);

        const distance = Math.sqrt(
            Math.pow(nerdamer(result.pointOnLine.x).evaluate(), 2) +
            Math.pow(nerdamer(result.pointOnLine.z).evaluate(), 2) +
            Math.pow(nerdamer(result.pointOnLine.y).evaluate(), 2)
        );
        const formattedCoordinates = `(${result.point.x}, ${result.point.y}, ${result.point.z})`;
        const formattedDistance = distance.toFixed(3);

        return { point: formattedCoordinates, distance: formattedDistance };
    }

    calculateShortestDistanceBetweenLines(vector1, vector2) {
        const result = this.createEquationsDistance(vector1, vector2);
        const distance = Math.sqrt(
            Math.pow(nerdamer(result.distanceVector.x).evaluate(), 2) +
            Math.pow(nerdamer(result.distanceVector.z).evaluate(), 2) +
            Math.pow(nerdamer(result.distanceVector.y).evaluate(), 2)
        );

        const formatVector1 = VectorOperations.formatVector(vector1, "p", "l1: ");
        const formatVector2 = VectorOperations.formatVector(vector2, "q", "l2: ");

        const formattedDistance = distance.toFixed(3);

        return { formatVector1: formatVector1, formatVector2: formatVector2, distance: formattedDistance };

    }

    static findShortestDistanceToPoint(vector) {
        const distanceVector = new DistanceVectorOperations();
        const result = distanceVector.calculateShortestDistanceToPoint(vector);
        console.log(`Point on the line: ${result.point}`);
        console.log(`Shortest distance from the point to the line: ${result.distance}`);
        return result;
    }

    static findShortestDistanceBetweenLines(vector1, vector2) {
        const distanceVector = new DistanceVectorOperations();
        const result = distanceVector.calculateShortestDistanceBetweenLines(vector1, vector2);
        console.log(`Vector 1 on the line: ${result.formatVector1}`);
        console.log(`Vector 2 on the line: ${result.formatVector2}`);
        console.log(`Shortest distance from the point to the line: ${result.distance}`);
        return result;
    }
}


module.exports = {Vector, DistanceVector, VectorOperations, IntersectionVectorOperations, DistanceVectorOperations };
