// AI Neural Network Module - Simple neural network for advanced pattern learning
// This module implements a lightweight neural network that can learn complex patterns
// beyond simple rule-based matching, enabling more sophisticated predictions

import { AI_CONFIG } from './ai-config.js';

/**
 * AINeural - Simple neural network for advanced pattern recognition
 * 
 * This is a basic feedforward neural network with:
 * - Input layer: Program item features (title, type, performer, etc.)
 * - Hidden layer: Pattern recognition nodes
 * - Output layer: Tech field predictions
 * 
 * The network learns from user corrections and improves over time
 */
export class AINeural {
    constructor() {
        this.isInitialized = false;
        this.inputSize = 0;
        this.hiddenSize = AI_CONFIG.NEURAL.HIDDEN_NODES;
        this.outputSize = AI_CONFIG.TECH_FIELDS.length;
        
        // Network weights - will be initialized when we know input size
        this.weightsInputHidden = null;
        this.weightsHiddenOutput = null;
        this.hiddenBias = null;
        this.outputBias = null;
        
        // Training parameters
        this.learningRate = AI_CONFIG.NEURAL.LEARNING_RATE;
        this.momentum = 0.9;
        this.previousWeightDeltaIH = null;
        this.previousWeightDeltaHO = null;
        
        // Feature encoding
        this.featureEncoder = new FeatureEncoder();
        this.trainingData = [];
        this.validationData = [];
        
        console.log('[AI Neural] Neural network module initialized');
    }

    /**
     * Initialize the network with proper dimensions
     * @param {Array} sampleFeatures - Sample feature vector to determine input size
     */
    initializeNetwork(sampleFeatures) {
        this.inputSize = sampleFeatures.length;
        
        // Initialize weights with small random values (Xavier initialization)
        const xavier = Math.sqrt(2.0 / (this.inputSize + this.hiddenSize));
        
        this.weightsInputHidden = this.createMatrix(this.inputSize, this.hiddenSize);
        this.weightsHiddenOutput = this.createMatrix(this.hiddenSize, this.outputSize);
        
        // Random initialization
        for (let i = 0; i < this.inputSize; i++) {
            for (let j = 0; j < this.hiddenSize; j++) {
                this.weightsInputHidden[i][j] = (Math.random() - 0.5) * 2 * xavier;
            }
        }
        
        for (let i = 0; i < this.hiddenSize; i++) {
            for (let j = 0; j < this.outputSize; j++) {
                this.weightsHiddenOutput[i][j] = (Math.random() - 0.5) * 2 * xavier;
            }
        }
        
        // Initialize biases
        this.hiddenBias = new Array(this.hiddenSize).fill(0);
        this.outputBias = new Array(this.outputSize).fill(0);
        
        // Initialize momentum arrays
        this.previousWeightDeltaIH = this.createMatrix(this.inputSize, this.hiddenSize, 0);
        this.previousWeightDeltaHO = this.createMatrix(this.hiddenSize, this.outputSize, 0);
        
        this.isInitialized = true;
        console.log(`[AI Neural] Network initialized: ${this.inputSize} -> ${this.hiddenSize} -> ${this.outputSize}`);
    }

    /**
     * Create a matrix filled with a value
     * @param {number} rows - Number of rows
     * @param {number} cols - Number of columns
     * @param {number} fillValue - Value to fill with (default: 0)
     * @returns {Array} 2D array matrix
     */
    createMatrix(rows, cols, fillValue = 0) {
        const matrix = [];
        for (let i = 0; i < rows; i++) {
            matrix[i] = new Array(cols).fill(fillValue);
        }
        return matrix;
    }

    /**
     * Forward pass through the network
     * @param {Array} input - Input feature vector
     * @returns {Object} {output: Array, hiddenActivation: Array}
     */
    forward(input) {
        if (!this.isInitialized) {
            this.initializeNetwork(input);
        }
        
        // Input to hidden layer
        const hiddenInput = new Array(this.hiddenSize).fill(0);
        for (let j = 0; j < this.hiddenSize; j++) {
            for (let i = 0; i < this.inputSize; i++) {
                hiddenInput[j] += input[i] * this.weightsInputHidden[i][j];
            }
            hiddenInput[j] += this.hiddenBias[j];
        }
        
        // Apply activation function (ReLU) to hidden layer
        const hiddenActivation = hiddenInput.map(x => Math.max(0, x));
        
        // Hidden to output layer
        const outputInput = new Array(this.outputSize).fill(0);
        for (let j = 0; j < this.outputSize; j++) {
            for (let i = 0; i < this.hiddenSize; i++) {
                outputInput[j] += hiddenActivation[i] * this.weightsHiddenOutput[i][j];
            }
            outputInput[j] += this.outputBias[j];
        }
        
        // Apply sigmoid activation to output layer (for probability-like outputs)
        const output = outputInput.map(x => this.sigmoid(x));
        
        return {
            output: output,
            hiddenActivation: hiddenActivation
        };
    }

    /**
     * Predict tech fields for a program item
     * @param {Object} programItem - Program item with title, type, performer, etc.
     * @returns {Object} Predictions for each tech field with confidence scores
     */
    predict(programItem) {
        if (!this.isInitialized) {
            // Return empty predictions if network isn't ready
            const emptyPredictions = {};
            AI_CONFIG.TECH_FIELDS.forEach(field => {
                emptyPredictions[field] = { value: '', confidence: 0 };
            });
            return emptyPredictions;
        }

        try {
            // Encode the program item into features
            const features = this.featureEncoder.encode(programItem);
            
            // Forward pass
            const result = this.forward(features);
            const outputs = result.output;
            
            // Convert network outputs to field predictions
            const predictions = {};
            AI_CONFIG.TECH_FIELDS.forEach((field, index) => {
                const confidence = outputs[index];
                
                // For now, we'll use the network output as a confidence modifier
                // and still rely on pattern matching for actual values
                // This is a hybrid approach that combines neural network insights
                // with deterministic pattern matching
                
                predictions[field] = {
                    value: '', // Will be filled by pattern matching
                    confidence: confidence,
                    neuralConfidence: confidence
                };
            });
            
            return predictions;
            
        } catch (error) {
            console.error('[AI Neural] Error during prediction:', error);
            // Return safe empty predictions
            const emptyPredictions = {};
            AI_CONFIG.TECH_FIELDS.forEach(field => {
                emptyPredictions[field] = { value: '', confidence: 0 };
            });
            return emptyPredictions;
        }
    }

    /**
     * Train the network with a single example
     * @param {Object} programItem - Input program item
     * @param {Object} targetValues - Target tech field values
     */
    trainSingle(programItem, targetValues) {
        if (!this.isInitialized) {
            console.warn('[AI Neural] Cannot train: network not initialized');
            return;
        }

        try {
            // Encode input
            const features = this.featureEncoder.encode(programItem);
            
            // Create target vector
            const target = this.createTargetVector(targetValues);
            
            // Forward pass
            const forwardResult = this.forward(features);
            const output = forwardResult.output;
            const hiddenActivation = forwardResult.hiddenActivation;
            
            // Backward pass (backpropagation)
            this.backpropagate(features, hiddenActivation, output, target);
            
        } catch (error) {
            console.error('[AI Neural] Error during training:', error);
        }
    }

    /**
     * Create target vector from tech field values
     * @param {Object} targetValues - Object with field names and values
     * @returns {Array} Target vector for the neural network
     */
    createTargetVector(targetValues) {
        const target = new Array(this.outputSize).fill(0);
        
        AI_CONFIG.TECH_FIELDS.forEach((field, index) => {
            // For now, use binary encoding: 1 if field has a value, 0 otherwise
            if (targetValues[field] && targetValues[field].trim() !== '') {
                target[index] = 1;
            }
        });
        
        return target;
    }

    /**
     * Backpropagation algorithm
     * @param {Array} input - Input features
     * @param {Array} hiddenActivation - Hidden layer activations
     * @param {Array} output - Network output
     * @param {Array} target - Target output
     */
    backpropagate(input, hiddenActivation, output, target) {
        // Calculate output layer errors
        const outputErrors = new Array(this.outputSize);
        for (let i = 0; i < this.outputSize; i++) {
            const error = target[i] - output[i];
            outputErrors[i] = error * this.sigmoidDerivative(output[i]);
        }
        
        // Calculate hidden layer errors
        const hiddenErrors = new Array(this.hiddenSize).fill(0);
        for (let i = 0; i < this.hiddenSize; i++) {
            let error = 0;
            for (let j = 0; j < this.outputSize; j++) {
                error += outputErrors[j] * this.weightsHiddenOutput[i][j];
            }
            // ReLU derivative
            hiddenErrors[i] = hiddenActivation[i] > 0 ? error : 0;
        }
        
        // Update weights and biases with momentum
        
        // Hidden to output weights
        for (let i = 0; i < this.hiddenSize; i++) {
            for (let j = 0; j < this.outputSize; j++) {
                const weightDelta = this.learningRate * outputErrors[j] * hiddenActivation[i] +
                                  this.momentum * this.previousWeightDeltaHO[i][j];
                this.weightsHiddenOutput[i][j] += weightDelta;
                this.previousWeightDeltaHO[i][j] = weightDelta;
            }
        }
        
        // Input to hidden weights
        for (let i = 0; i < this.inputSize; i++) {
            for (let j = 0; j < this.hiddenSize; j++) {
                const weightDelta = this.learningRate * hiddenErrors[j] * input[i] +
                                  this.momentum * this.previousWeightDeltaIH[i][j];
                this.weightsInputHidden[i][j] += weightDelta;
                this.previousWeightDeltaIH[i][j] = weightDelta;
            }
        }
        
        // Update biases
        for (let i = 0; i < this.hiddenSize; i++) {
            this.hiddenBias[i] += this.learningRate * hiddenErrors[i];
        }
        
        for (let i = 0; i < this.outputSize; i++) {
            this.outputBias[i] += this.learningRate * outputErrors[i];
        }
    }

    /**
     * Sigmoid activation function
     * @param {number} x - Input value
     * @returns {number} Sigmoid output
     */
    sigmoid(x) {
        return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x)))); // Clamp to prevent overflow
    }

    /**
     * Sigmoid derivative for backpropagation
     * @param {number} sigmoidOutput - Output of sigmoid function
     * @returns {number} Derivative value
     */
    sigmoidDerivative(sigmoidOutput) {
        return sigmoidOutput * (1 - sigmoidOutput);
    }

    /**
     * Batch training with multiple examples
     * @param {Array} trainingExamples - Array of {input, target} objects
     * @param {number} epochs - Number of training epochs
     */
    trainBatch(trainingExamples, epochs = 10) {
        if (!trainingExamples || trainingExamples.length === 0) {
            console.warn('[AI Neural] No training examples provided');
            return;
        }

        console.log(`[AI Neural] Starting batch training: ${trainingExamples.length} examples, ${epochs} epochs`);
        
        for (let epoch = 0; epoch < epochs; epoch++) {
            // Shuffle training data
            const shuffled = this.shuffleArray([...trainingExamples]);
            
            let totalError = 0;
            
            for (const example of shuffled) {
                this.trainSingle(example.input, example.target);
                
                // Calculate error for monitoring
                const prediction = this.forward(this.featureEncoder.encode(example.input));
                const target = this.createTargetVector(example.target);
                
                for (let i = 0; i < target.length; i++) {
                    totalError += Math.pow(target[i] - prediction.output[i], 2);
                }
            }
            
            const avgError = totalError / (trainingExamples.length * this.outputSize);
            
            if (epoch % 5 === 0) {
                console.log(`[AI Neural] Epoch ${epoch}: Average error = ${avgError.toFixed(4)}`);
            }
        }
        
        console.log('[AI Neural] Batch training completed');
    }

    /**
     * Shuffle array in place
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled array
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Save the neural network weights and configuration
     * @returns {Object} Serialized network data
     */
    serialize() {
        if (!this.isInitialized) {
            return null;
        }
        
        return {
            inputSize: this.inputSize,
            hiddenSize: this.hiddenSize,
            outputSize: this.outputSize,
            weightsInputHidden: this.weightsInputHidden,
            weightsHiddenOutput: this.weightsHiddenOutput,
            hiddenBias: this.hiddenBias,
            outputBias: this.outputBias,
            learningRate: this.learningRate,
            featureEncoder: this.featureEncoder.serialize(),
            timestamp: Date.now()
        };
    }

    /**
     * Load neural network from serialized data
     * @param {Object} data - Serialized network data
     */
    deserialize(data) {
        if (!data) return;
        
        try {
            this.inputSize = data.inputSize;
            this.hiddenSize = data.hiddenSize;
            this.outputSize = data.outputSize;
            this.weightsInputHidden = data.weightsInputHidden;
            this.weightsHiddenOutput = data.weightsHiddenOutput;
            this.hiddenBias = data.hiddenBias;
            this.outputBias = data.outputBias;
            this.learningRate = data.learningRate || AI_CONFIG.NEURAL.LEARNING_RATE;
            
            // Initialize momentum arrays
            this.previousWeightDeltaIH = this.createMatrix(this.inputSize, this.hiddenSize, 0);
            this.previousWeightDeltaHO = this.createMatrix(this.hiddenSize, this.outputSize, 0);
            
            // Load feature encoder
            if (data.featureEncoder) {
                this.featureEncoder.deserialize(data.featureEncoder);
            }
            
            this.isInitialized = true;
            console.log('[AI Neural] Network loaded from saved data');
            
        } catch (error) {
            console.error('[AI Neural] Error loading network:', error);
            this.isInitialized = false;
        }
    }
}

/**
 * FeatureEncoder - Converts program items into numerical feature vectors
 * This is crucial for the neural network to process text-based program data
 */
class FeatureEncoder {
    constructor() {
        this.vocabulary = new Set();
        this.wordToIndex = {};
        this.maxFeatures = 100; // Limit feature vector size
        this.isBuilt = false;
    }

    /**
     * Build vocabulary from training data
     * @param {Array} programItems - Array of program items
     */
    buildVocabulary(programItems) {
        this.vocabulary.clear();
        
        for (const item of programItems) {
            // Extract text from all relevant fields
            const texts = [
                item.title || '',
                item.type || '',
                item.performer || '',
                item.notes || ''
            ];
            
            for (const text of texts) {
                const words = this.tokenize(text);
                words.forEach(word => this.vocabulary.add(word));
            }
        }
        
        // Convert vocabulary to index mapping (limit to most common words)
        const sortedWords = Array.from(this.vocabulary)
            .slice(0, this.maxFeatures - 10); // Reserve space for special features
        
        this.wordToIndex = {};
        sortedWords.forEach((word, index) => {
            this.wordToIndex[word] = index;
        });
        
        this.isBuilt = true;
        console.log(`[AI Neural] Vocabulary built: ${Object.keys(this.wordToIndex).length} words`);
    }

    /**
     * Convert program item to feature vector
     * @param {Object} programItem - Program item object
     * @returns {Array} Feature vector
     */
    encode(programItem) {
        const features = new Array(this.maxFeatures).fill(0);
        
        if (!this.isBuilt) {
            // Return basic features if vocabulary isn't built yet
            return this.encodeBasic(programItem);
        }
        
        // Text-based features using bag-of-words
        const texts = [
            programItem.title || '',
            programItem.type || '',
            programItem.performer || '',
            programItem.notes || ''
        ];
        
        for (const text of texts) {
            const words = this.tokenize(text);
            for (const word of words) {
                const index = this.wordToIndex[word];
                if (index !== undefined) {
                    features[index] = 1; // Binary encoding (word present or not)
                }
            }
        }
        
        // Add special features at the end
        const specialFeatureStart = this.maxFeatures - 10;
        
        // Song number present
        features[specialFeatureStart] = /\d+/.test(programItem.title || '') ? 1 : 0;
        
        // Title length (normalized)
        features[specialFeatureStart + 1] = Math.min(1, (programItem.title || '').length / 50);
        
        // Has performer
        features[specialFeatureStart + 2] = (programItem.performer || '').trim() ? 1 : 0;
        
        // Item position (if available)
        features[specialFeatureStart + 3] = programItem.index ? Math.min(1, programItem.index / 20) : 0;
        
        return features;
    }

    /**
     * Basic encoding when vocabulary isn't built
     * @param {Object} programItem - Program item object
     * @returns {Array} Basic feature vector
     */
    encodeBasic(programItem) {
        const features = new Array(20).fill(0); // Smaller vector for basic features
        
        // Basic features without vocabulary
        const title = programItem.title || '';
        const type = programItem.type || '';
        const performer = programItem.performer || '';
        
        // Simple heuristic features
        features[0] = title.length > 0 ? 1 : 0;
        features[1] = /song|hymn|music/i.test(title) ? 1 : 0;
        features[2] = /prayer|scripture|sermon/i.test(title) ? 1 : 0;
        features[3] = /piano|organ|guitar/i.test(performer) ? 1 : 0;
        features[4] = /choir|ensemble|quartet/i.test(performer) ? 1 : 0;
        features[5] = /\d+/.test(title) ? 1 : 0; // Has numbers
        features[6] = performer.length > 0 ? 1 : 0;
        features[7] = type.length > 0 ? 1 : 0;
        
        return features;
    }

    /**
     * Tokenize text into words
     * @param {string} text - Input text
     * @returns {Array} Array of words
     */
    tokenize(text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, ' ') // Remove punctuation
            .split(/\s+/)
            .filter(word => word.length > 1); // Remove single characters
    }

    /**
     * Serialize the feature encoder
     * @returns {Object} Serialized encoder data
     */
    serialize() {
        return {
            wordToIndex: this.wordToIndex,
            maxFeatures: this.maxFeatures,
            isBuilt: this.isBuilt
        };
    }

    /**
     * Load feature encoder from serialized data
     * @param {Object} data - Serialized encoder data
     */
    deserialize(data) {
        if (data) {
            this.wordToIndex = data.wordToIndex || {};
            this.maxFeatures = data.maxFeatures || 100;
            this.isBuilt = data.isBuilt || false;
            this.vocabulary = new Set(Object.keys(this.wordToIndex));
        }
    }
}
