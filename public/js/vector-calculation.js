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

    static calculateScalar(vector1, vector2, equs) {
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
        const intersection = VectorOperations.findIntersection(
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
            VectorOperations.calculateScalar(vector1, vector2, equs);

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

            if (!VectorOperations.doVectorsIntersect(vector1, vector2)) {
                return tryCreateVectors();
            }

            const vector1Equation = VectorOperations.calculateVectorEquation(vector1, 1);
            const vector2Equation = VectorOperations.calculateVectorEquation(vector2, 2);
            const coordinates = VectorOperations.calculateCoordinates(vector1, vector2, [vector1.scalar, vector2.scalar]);

            return { vector1: vector1Equation, vector2: vector2Equation, coordinates: coordinates };
        }

        return tryCreateVectors();
    }
}

module.exports = { Vector, VectorOperations };
