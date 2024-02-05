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

    calculateCoordinate() {
        if (this.scalar !== null) {
            const xCoordinate = this.position.x + this.scalar * this.direction.a;
            const yCoordinate = this.position.y + this.scalar * this.direction.b;
            const zCoordinate = this.position.z + this.scalar * this.direction.c;

            this.coordinates = {
                x: parseFloat(xCoordinate.toFixed(2)),
                y: parseFloat(yCoordinate.toFixed(2)),
                z: parseFloat(zCoordinate.toFixed(2)),
            };

            return `(${this.coordinates.x}, ${this.coordinates.y}, ${this.coordinates.z})`
        } else {
            console.log("Scalar component is null. Set a valid scalar value.");
        }
    }
    
    getRandomNumber() {
        return Math.floor(Math.random() * 8);
    }

    formatVector(Coeff, front) {
        const { x, y, z } = this.position;
        const { a, b, c } = this.direction;
        const scalarCoeff = Coeff
        return `${front}r = (${x}, ${y}, ${z}) + ${scalarCoeff}(${a}, ${b}, ${c})`;
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

class Planes extends Vector {
    constructor () {
        super();
        this.position = {
            x: this.getRandomNumber(),
            y: this.getRandomNumber(),
            z: this.getRandomNumber(),
        }
        this.direction1 = {
            a: this.getRandomNumber(),
            b: this.getRandomNumber(),
            c: this.getRandomNumber(),
        }
        this.direction2 = {
            d: this.getRandomNumber(),
            e: this.getRandomNumber(),
            f: this.getRandomNumber(),
        }
    }

    formatPlane(Coeff1, Coeff2, front) {
        const { x, y, z } = this.position;
        const { a, b, c } = this.direction1;
        const { d, e, f} = this.direction2;
        return `${front}r = (${x}, ${y}, ${z}) + ${Coeff1}(${a}, ${b}, ${c}) + ${Coeff2}(${d}, ${e}, ${f})`;
    }
}

class VectorOperations {
    static areParallel(vector1, vector2) {
        const vector1Arr = [
            vector1.direction.a,
            vector1.direction.b,
            vector1.direction.c
        ];
        const vector2Arr = [
            vector2.direction.a,
            vector2.direction.b,
            vector2.direction.c
        ];
        for (let i = 0; i < vector1Arr.length; i++) {
            if ((vector1Arr[i] === 0 && vector2Arr[i] !== 0) || (vector1Arr[i] !== 0 && vector2Arr[i] === 0)) {
                return false;
            }
            if (vector1Arr[i] !== 0 && vector2Arr[i] !== 0 && vector1Arr[i] % vector2Arr[i] !== 0) {
                return false;
            }
        };
    
        return true;
    } 

    static calculateScalars(vector1, vector2) {
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

        const equations = [
            "(" + linePosition1[0] + " + p * " + lineDirection1[0] + ") = (" + linePosition2[0] + " + q * " + lineDirection2[0] + ")",
            "(" + linePosition1[1] + " + p * " + lineDirection1[1] + ") = (" + linePosition2[1] + " + q * " + lineDirection2[1] + ")",
        ];
        const expression1 = "(" + linePosition1[2] + " + p * " + lineDirection1[2] + ")";
        const expression2 = "(" + linePosition2[2] + " + q * " + lineDirection2[2] + ")";
                
        try {
            var solutions = nerdamer.solveEquations(equations);
        
            if (solutions.length > 0) {
                const roundedSolutions = solutions.map(([variable, value]) => [variable, parseFloat(value.toFixed(3))]);
        
                const p = parseFloat(roundedSolutions.find(([variable]) => variable === 'p')[1].toFixed(3));
                const q = parseFloat(roundedSolutions.find(([variable]) => variable === 'q')[1].toFixed(3));
                
                const resultExpression1 = nerdamer(expression1).evaluate({ p });
                const resultExpression2 = nerdamer(expression2).evaluate({ q });
        
                if (resultExpression1.equals(resultExpression2)) {
                    vector1.scalar = p;
                    vector2.scalar = q;
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
        
    }

}

class IntersectionVectorOperations extends VectorOperations {
    static doVectorsIntersect(vector1, vector2) {
        const isParallel = VectorOperations.areParallel(vector1,vector2);

        if (isParallel) {
            return false;
        } else {
            const result = VectorOperations.calculateScalars(vector1, vector2) 

            return result;         
        }
    }

    static calculateVectorEquation(vector, val) {
        const { x, y, z } = vector.position;
        const { a, b, c } = vector.direction;
        const vectorCoefficient = val === 1 ? "p" : "q";
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
            const coordinates1 = vector1.calculateCoordinate()
            const coordinates2 = vector2.calculateCoordinate()

            if (coordinates1 == coordinates2) {
                return { vector1: vector1Equation, vector2: vector2Equation, coordinates: coordinates1 };
            }
            else {
                return tryCreateVectors()
            }
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
    
        const equation = scalarProduct.join(" + ") + " = 0";

        var p = nerdamer.solve(equation, 'p');

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

        const roundedSolutions = solutions.map(([variable, value]) => [variable, parseFloat(value.toFixed(3))]);

        const p = parseFloat(roundedSolutions.find(([variable]) => variable === 'p')[1].toFixed(3));
        const q = parseFloat(roundedSolutions.find(([variable]) => variable === 'q')[1].toFixed(3));

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

        const formatVector1 = vector1.formatVector("p", "l1: ");
        const formatVector2 = vector2.formatVector("q", "l2: ");

        const formattedDistance = distance.toFixed(3);

        return { formatVector1: formatVector1, formatVector2: formatVector2, distance: formattedDistance };

    }

    static findShortestDistanceToPoint(vector) {
        const distanceVector = new DistanceVectorOperations();
        const result = distanceVector.calculateShortestDistanceToPoint(vector);
        return result;
    }

    static findShortestDistanceBetweenLines(vector1, vector2) {
        const distanceVector = new DistanceVectorOperations();
        const result = distanceVector.calculateShortestDistanceBetweenLines(vector1, vector2);
        return result;
    }
}

class PlaneVectorOperations extends VectorOperations {
    calcuateIntersection(vector, plane) {
        var OA = [
            "(" + vector.position.x + " +  p * " + vector.direction.a + ")",
            "(" + vector.position.y + " +  p * " + vector.direction.b + ")",
            "(" + vector.position.z + " +  p * " + vector.direction.c + ")",
        ];
        const OB = [
            "(" + plane.position.x + " + (q * " + plane.direction1.a + ") + (r * " + plane.direction2.d + "))",
            "(" + plane.position.y + " + (q * " + plane.direction1.b + ") + (r * " + plane.direction2.e + "))",
            "(" + plane.position.z + " + (q * " + plane.direction1.c + ") + (r * " + plane.direction2.f + "))",
        ];
        
        const equation1 = OA[0] + " = " + OB[0];
        const equation2 = OA[1] + " = " + OB[1];
        const equation3 = OA[2] + " = " + OB[2];
        try {
            const solution = nerdamer.solveEquations([equation1, equation2, equation3]);
            console.log(solution)
    
            const pValuePair = solution.find(entry => entry[0] === 'p');
            const pValue = pValuePair ? parseFloat(pValuePair[1]) : null;
            
            vector.scalar = pValue;
            const coordinates = vector.calculateCoordinate()
    
            return coordinates
        }
        catch {
            console.log("no solution");
            return null
        }

    }

    static findPlaneIntersectionWithLine(vector) {
        try {
            var plane = new Planes();
            const planeVector = new PlaneVectorOperations();
            var coordinates = planeVector.calcuateIntersection(vector, plane);
            if (coordinates == null) {
                coordinates = this.findPlaneIntersectionWithLine(vector);
            }
            const formattedVector = vector.formatVector("p", "l1: ");
            const formattedPlane = plane.formatPlane("q", "r", "r: ");
            return { formattedVector, formattedPlane, coordinates };
        } catch (error) {
            console.log(`Error: ${error.message}. Retrying...`);
            const newVector = new Vector();
            return this.findPlaneIntersectionWithLine(newVector);
        }
    }

    static convertFromVectorToCartesian(plane) {
        var plane = new Planes();        
        const crossProduct = [
            `(${plane.direction1.b} * ${plane.direction2.f}) - (${plane.direction1.c} * ${plane.direction2.e})`,
            `(${plane.direction1.c} * ${plane.direction2.d}) - (${plane.direction1.a} * ${plane.direction2.f})`,
            `(${plane.direction1.a} * ${plane.direction2.e}) - (${plane.direction1.b} * ${plane.direction2.d})`
        ];
        
        const numericValues = crossProduct.map(expression => nerdamer(expression).evaluate().toString());
        const [xCoefficient, yCoefficient, zCoefficient] = numericValues;
       
        const dotProduct = `(${plane.position.x} * ${xCoefficient}) + (${plane.position.y} * ${yCoefficient}) + (${plane.position.z} * ${zCoefficient})`;
        const dotProductValue = nerdamer(dotProduct).evaluate().toString();
        
        console.log('Dot Product:', dotProductValue);

        const equationTerms = [
            xCoefficient !== '0' ? `${xCoefficient > 0 ? '' : '-'}${Math.abs(xCoefficient) === 1 ? '' : Math.abs(xCoefficient)}x` : '',
            yCoefficient !== '0' ? `${yCoefficient > 0 ? '+ ' : '-'}${Math.abs(yCoefficient) === 1 ? '' : Math.abs(yCoefficient)}y` : '',
            zCoefficient !== '0' ? `${zCoefficient > 0 ? '+ ' : '-'}${Math.abs(zCoefficient) === 1 ? '' : Math.abs(zCoefficient)}z` : ''
        ].filter(term => term !== '');

        if (equationTerms.length > 0 && equationTerms[0][0] !== '-') {
            equationTerms[0] = `-${equationTerms[0]}`;
        }

        const formattedCartesianEquation = equationTerms.join(' ') + ` = ${dotProductValue}`;
        console.log('Formatted Equation:', formattedCartesianEquation);    
        const formattedPlane = plane.formatPlane("q", "r", "r: ");

        return {
            vectorPlane : formattedPlane,
            cartesianPlane : formattedCartesianEquation
        }
    }
    

}


module.exports = {Vector, DistanceVector, Planes, VectorOperations, IntersectionVectorOperations, DistanceVectorOperations, PlaneVectorOperations };
