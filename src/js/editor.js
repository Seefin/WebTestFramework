/**
 * Message templates used in the editor.
 * 
 * @constant {Object} MESSAGES
 * @property {Function} ERR_EMPTY - Returns a message indicating that a value is required.
 * @property {Function} ERR_INVALID - Returns a message indicating that the provided JSON is invalid.
 * @property {Function} ERR_NOFILE - Returns a message indicating that the user needs to select a file.
 * @property {Function} CONFIRM_DELETE_TEST - Returns a confirmation message for deleting a test.
 */
const MESSAGES = {
    ERR_EMPTY: () => "Please enter a value",
    ERR_INVALID: () => "Invalid JSON",
    ERR_NOFILE: () => "Please select a file to load",
    CONFIRM_DELETE_TEST: (test) => `Are you sure you want to delete test ${test}?`
}

/**
 * IDs of various HTML elements used in the editor.
 * 
 * @constant {Object} ELEMENT_IDS
 * @property {string} EDITOR_FORM - The ID of the editor form element.
 * @property {string} EDITOR_LANDING - The ID of the editor landing element.
 * @property {string} METADATA_FORM - The ID of the metadata form element.
 * @property {string} POSTCONDITIONS_LIST - The ID of the postconditions list element.
 * @property {string} PRECONDITIONS_LIST - The ID of the preconditions list element.
 * @property {string} PROCEDURE_AUTHOR - The ID of the procedure author element.
 * @property {string} PROCEDURE_DESCRIPTION - The ID of the procedure description element.
 * @property {string} PROCEDURE_NAME - The ID of the procedure name element.
 * @property {string} PROCEDURE_UPDATED - The ID of the procedure updated element.
 * @property {string} STEP_DESCRIPTION - The ID of the step description element.
 * @property {string} STEP_EDITOR - The ID of the step editor element.
 * @property {string} STEP_FORM - The ID of the step form element.
 * @property {string} STEP_LIST - The ID of the steps list element.
 * @property {string} STEP_NAME - The ID of the step name element.
 * @property {string} STEP_NUMBER - The ID of the step number element.
 * @property {string} TEST_EDITOR - The ID of the test editor element.
 * @property {string} TEST_FORM - The ID of the test form element.
 * @property {string} TEST_LIST - The ID of the test list element.
 * @property {string} TEST_NAME - The ID of the test name element.
 * @property {string} TEST_STEPS - The ID of the test steps element.
 */
const ELEMENT_IDS = {
    EDITOR_FORM: 'editor-form',
    EDITOR_LANDING: 'editor-landing',
    METADATA_FORM: 'metadata-form',
    POSTCONDITIONS_LIST: 'postconditions-list',
    PRECONDITIONS_LIST: 'preconditions-list',
    PROCEDURE_AUTHOR: 'procedure-author',
    PROCEDURE_DESCRIPTION: 'procedure-description',
    PROCEDURE_NAME: 'procedure-name',
    PROCEDURE_UPDATED: 'procedure-updated',
    STEP_DESCRIPTION: 'step-description',
    STEP_EDITOR: 'step-editor',
    STEP_FORM: 'step-form',
    STEP_LIST: 'steps-list',
    STEP_NAME: 'step-name',
    STEP_NUMBER: 'step-number',
    TEST_EDITOR: 'test-editor',
    TEST_FORM: 'test-form',
    TEST_LIST: 'test-list',
    TEST_NAME: 'test-name',
    TEST_STEPS: 'test-steps'
}
/**
 * Array of all tests in the current procedure.
 * @type {Array}
 */
let currentTests = [];
/**
 * Array of all steps in the current test.
 * @type {Array}
 */
let currentSteps = [];
/**
 * Index of the currently edited test.
 * @type {number}
 */
let currentTestIndex = undefined;
/**
 * Index of the currently edited step.
 * @type {number}
 */
let currentStepIndex = undefined;

document.getElementById('create-new').addEventListener('click', () => {
    document.getElementById(ELEMENT_IDS.EDITOR_LANDING).classList.add('hidden');
    document.getElementById(ELEMENT_IDS.EDITOR_FORM).classList.remove('hidden');
    clearProcedureForm();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById(ELEMENT_IDS.PROCEDURE_UPDATED).value = today;
});

document.getElementById('viewer-button').addEventListener('click', () => {
    window.location.href = 'index.html';
});

document.getElementById('load-existing').addEventListener('click', () => {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const procedure = JSON.parse(e.target.result);
            loadProcedure(procedure);
        };
        reader.readAsText(file);
    } else {
        alert(MESSAGES.ERR_NOFILE());
    }
});

document.getElementById('save-procedure').addEventListener('click', () => {
    storeProcedure();
});

document.getElementById('back-to-landing').addEventListener('click', () => {
    document.getElementById(ELEMENT_IDS.EDITOR_LANDING).classList.remove('hidden');
    document.getElementById(ELEMENT_IDS.EDITOR_FORM).classList.add('hidden');
    clearProcedureForm();
});

document.getElementById('add-test').addEventListener('click', () => {
    clearTestForm();
    document.getElementById(ELEMENT_IDS.TEST_FORM).reset();
    document.getElementById(ELEMENT_IDS.EDITOR_FORM).classList.add('hidden');
    document.getElementById(ELEMENT_IDS.TEST_EDITOR).classList.remove('hidden');
});

document.getElementById('test-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const test = {
        "Test Name": document.getElementById(ELEMENT_IDS.TEST_NAME).value,
        "Test Preconditions": Array.from(document.querySelectorAll('.precondition-input')).map(input => input.value).filter(Boolean),
        "Test Postconditions": Array.from(document.querySelectorAll('.postcondition-input')).map(input => input.value).filter(Boolean),
        "Test Steps": currentSteps
    };

    if (currentTestIndex !== undefined) {
        currentTests[currentTestIndex] = test;
        currentTestIndex = undefined;
    } else {
        currentTests.push(test);
    }

    document.getElementById(ELEMENT_IDS.EDITOR_FORM).classList.remove('hidden');
    document.getElementById(ELEMENT_IDS.TEST_EDITOR).classList.add('hidden');
    
    renderTests(document.getElementById(ELEMENT_IDS.TEST_LIST));
});

document.getElementById('cancel-test').addEventListener('click', () => {
    document.getElementById(ELEMENT_IDS.EDITOR_FORM).classList.remove('hidden');
    document.getElementById(ELEMENT_IDS.TEST_EDITOR).classList.add('hidden');
});

document.getElementById('add-precondition').addEventListener('click', () => {
    const container = document.createElement('div');
    container.className = 'condition-row';
    container.innerHTML = `
        <input type="text" class="precondition-input">
        <div class="condition-buttons">
            <button type="button" onclick="deleteTestCondition(this)" class="button">Delete</button>
        </div>
    `;
    document.getElementById(ELEMENT_IDS.PRECONDITIONS_LIST).appendChild(container);
});

document.getElementById('add-postcondition').addEventListener('click', () => {
    const container = document.createElement('div');
    container.className = 'condition-row';
    container.innerHTML = `
        <input type="text" class="postcondition-input">
        <div class="condition-buttons">
            <button type="button" onclick="deleteTestCondition(this)" class="button">Delete</button>
        </div>
    `;
    document.getElementById(ELEMENT_IDS.POSTCONDITIONS_LIST).appendChild(container);
});

document.getElementById(ELEMENT_IDS.STEP_FORM).addEventListener('submit', (e) => {
    e.preventDefault();

    const step = {
        step: parseInt(document.getElementById(ELEMENT_IDS.STEP_NUMBER).value, 10),
        stepName: document.getElementById(ELEMENT_IDS.STEP_NAME).value,
        description: document.getElementById(ELEMENT_IDS.STEP_DESCRIPTION).value
    };

    if (currentStepIndex !== undefined) {
        currentSteps[currentStepIndex] = step;
        currentStepIndex = undefined;
    } else {
        currentSteps.push(step);
    }

    currentSteps.sort((a, b) => a.step - b.step);

    document.getElementById(ELEMENT_IDS.STEP_EDITOR).classList.add('hidden');
    document.getElementById(ELEMENT_IDS.TEST_EDITOR).classList.remove('hidden');
    renderSteps();
});

document.getElementById('add-step').addEventListener('click', () => {
    clearStepForm();
    document.getElementById(ELEMENT_IDS.TEST_EDITOR).classList.add('hidden');
    document.getElementById(ELEMENT_IDS.STEP_EDITOR).classList.remove('hidden');
});

document.getElementById('cancel-step').addEventListener('click', () => {
    document.getElementById(ELEMENT_IDS.STEP_EDITOR).classList.add('hidden');
    document.getElementById(ELEMENT_IDS.TEST_EDITOR).classList.remove('hidden');
});

// LOAD and STORE code
function loadProcedure(procedure) {
    document.getElementById(ELEMENT_IDS.EDITOR_LANDING).classList.add('hidden');
    document.getElementById(ELEMENT_IDS.EDITOR_FORM).classList.remove('hidden');

    document.getElementById(ELEMENT_IDS.PROCEDURE_NAME).value = procedure["Test Procedure"];
    document.getElementById(ELEMENT_IDS.PROCEDURE_UPDATED).value = procedure.Updated;
    document.getElementById(ELEMENT_IDS.PROCEDURE_AUTHOR).value = procedure.Author;
    document.getElementById(ELEMENT_IDS.PROCEDURE_DESCRIPTION).value = procedure.Description;
    currentTests = procedure.Tests;
    renderTests(document.getElementById(ELEMENT_IDS.TEST_LIST));
}

function storeProcedure() {
    const procedure = {
        "Test Procedure": document.getElementById(ELEMENT_IDS.PROCEDURE_NAME).value,
        "Updated": document.getElementById(ELEMENT_IDS.PROCEDURE_UPDATED).value,
        "Author": document.getElementById(ELEMENT_IDS.PROCEDURE_AUTHOR).value,
        "Description": document.getElementById(ELEMENT_IDS.PROCEDURE_DESCRIPTION).value,
        "Tests": currentTests
    };
    const blob = new Blob([JSON.stringify(procedure, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${procedure["Test Procedure"]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Clear Forms
function clearProcedureForm() {
    document.getElementById(ELEMENT_IDS.METADATA_FORM).reset();
}

function clearTestForm() {
    document.getElementById(ELEMENT_IDS.TEST_FORM).reset();
    document.getElementById(ELEMENT_IDS.PRECONDITIONS_LIST).innerHTML = `
    <div class="condition-row">
        <input type="text" class="precondition-input">
        <div class="condition-buttons">
            <button type="button" onclick="deleteTestCondition(this)" class="button">Delete</button>
        </div>
    </div>
    `;
    document.getElementById(ELEMENT_IDS.POSTCONDITIONS_LIST).innerHTML = `
        <div class="condition-row">
            <input type="text" class="postcondition-input">
            <div class="condition-buttons">
                <button type="button" onclick="deleteTestCondition(this)" class="button">Delete</button>
            </div>
        </div>
    `;
}

function clearStepForm() {
    document.getElementById('step-form').reset();
}

// Render Components
function renderTests(testList) {
    if (!testList) {
        return;
    }

    testList.innerHTML = currentTests.map((test, index) => `
        <div class="test-card">
            <span>${test["Test Name"]}</span>
            <div class="test-card-buttons">
                <button onclick="editTest(${index})">Edit</button>
                <button onclick="deleteTest(${index})">Delete</button>
            </div>
        </div>
    `).join('');
}

function renderSteps() {
    const stepsList = document.getElementById(ELEMENT_IDS.STEP_LIST);
    stepsList.innerHTML = currentSteps.map((step, index) => `
        <div class="step-card">
            <div class="step-header">
                <span class="step-title">Step ${step.step}: ${step.stepName}</span>
                <div class="test-card-buttons">
                    <button type="button" onclick="editStep(${index})" class="button">Edit</button>
                    <button type="button" onclick="deleteStep(${index})" class="button">Delete</button>
                </div>
            </div>
            <div class="step-description">${step.description}</div>
        </div>
    `).join('');
}

// Test CRUD code
function editTest(index) {
    currentTestIndex = index;
    const test = currentTests[index];
    document.getElementById(ELEMENT_IDS.TEST_NAME).value = test["Test Name"];
    currentSteps = test["Test Steps"];

    const preList = document.getElementById(ELEMENT_IDS.PRECONDITIONS_LIST);
    preList.innerHTML = test["Test Preconditions"]
        .map((pre) => `
            <div class="condition-row">
                <input type="text" class="precondition-input" value="${pre}">
                <div class="condition-buttons">
                    <button type="button" onclick="deleteTestCondition(this)" class="button">Delete</button>
                </div>
            </div>
            `)
        .join('');

    const postList = document.getElementById(ELEMENT_IDS.POSTCONDITIONS_LIST);
    postList.innerHTML = test["Test Postconditions"]
        .map((post) => `
            <div class="condition-row">
                <input type="text" class="postcondition-input" value="${post}">
                <div class="condition-buttons">
                    <button type="button" onclick="deleteTestCondition(this)" class="button">Delete</button>
                </div>
            </div>
        `)
        .join('');

    renderSteps();
    document.getElementById(ELEMENT_IDS.EDITOR_FORM).classList.add('hidden');
    document.getElementById(ELEMENT_IDS.TEST_EDITOR).classList.remove('hidden');
}

function deleteTest(index) {
    if (!index || index < 0 || index >= currentTests.length) {
        return;
    }
    if (confirm(MESSAGES.CONFIRM_DELETE_TEST(currentTests[index]["Test Name"]))) {
        currentTests.splice(index, 1);
        renderTests(document.getElementById(ELEMENT_IDS.TEST_LIST));
    }
}

function deleteTestCondition(button) {
    button.closest('.condition-row').remove();
}

// Step CRUD code
function editStep(index) {
    currentStepIndex = index;
    const step = currentSteps[index];
    document.getElementById(ELEMENT_IDS.STEP_NUMBER).value = step.step;
    document.getElementById(ELEMENT_IDS.STEP_NAME).value = step.stepName;
    document.getElementById(ELEMENT_IDS.STEP_DESCRIPTION).value = step.description;
    document.getElementById(ELEMENT_IDS.TEST_EDITOR).classList.add('hidden');
    document.getElementById(ELEMENT_IDS.STEP_EDITOR).classList.remove('hidden');
}

function deleteStep(index) {
    console.debug(index);
    if ( (!index && index !== 0) || index < 0 || index >= currentSteps.length) {
        console.debug(currentSteps.length);
        return;
    }
    if (confirm(`Are you sure you want to delete step ${currentSteps[index].stepName}?`)) {
        currentSteps.splice(index, 1);
        renderSteps();
    }
}