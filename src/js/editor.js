/**
 * Message templates used in the editor.
 * 
 * @constant {Object} MESSAGES
 * @property {Function} ERR_EMPTY - Returns a message indicating that a value is required.
 * @property {Function} ERR_INVALID - Returns a message indicating that the provided JSON is invalid.
 * @property {Function} CONFIRM_DELETE_TEST - Returns a confirmation message for deleting a test.
 */
const MESSAGES = {
    ERR_EMPTY: () => "Please enter a value",
    ERR_INVALID: () => "Invalid JSON",
    ERR_NOFILE: () => "Please select a file to load",
    CONFIRM_DELETE_TEST: (test) => `Are you sure you want to delete test ${test}?`
}

const ELEMENT_IDS = {
    EDITOR_LANDING: 'editor-landing',
    EDITOR_FORM: 'editor-form',
    PROCEDURE_NAME: 'procedure-name',
    PROCEDURE_UPDATED: 'procedure-updated',
    PROCEDURE_AUTHOR: 'procedure-author',
    PROCEDURE_DESCRIPTION: 'procedure-description',
    TEST_LIST: 'test-list',
    TEST_EDITOR: 'test-editor',
    TEST_FORM: 'test-form',
    TEST_NAME: 'test-name',
    PRECONDITIONS_LIST: 'preconditions-list',
    POSTCONDITIONS_LIST: 'postconditions-list',
    TEST_STEPS: 'test-steps',
    JSON_ERROR: 'json-error',
    JSON_CONTENT: 'json-content',
    METADATA_FORM: 'metadata-form'
}
/**
 * Array of all tests in the current procedure.
 * @type {Array}
 */
let currentTests = [];
/**
 * Index of the currently edited test.
 * @type {number}
 */
let currentTestIndex = undefined;

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

    const testStepsJson = document.getElementById(ELEMENT_IDS.TEST_STEPS).value;
    const validationResult = isValidJSON(testStepsJson);

    if (!validationResult.valid) {
        const errorMessage = document.getElementById(ELEMENT_IDS.JSON_ERROR);
        errorMessage.innerText = `${MESSAGES.ERR_INVALID()}: ${validationResult.message}`;
        errorMessage.classList.remove('hidden');
        document.getElementById(ELEMENT_IDS.TEST_STEPS).classList.add('error');
        highlightError(validationResult.line, validationResult.column, document.getElementById(ELEMENT_IDS.TEST_STEPS));
        return;
    }
    const test = {
        "Test Name": document.getElementById(ELEMENT_IDS.TEST_NAME).value,
        "Test Preconditions": Array.from(document.querySelectorAll('.precondition-input')).map(input => input.value).filter(Boolean),
        "Test Postconditions": Array.from(document.querySelectorAll('.postcondition-input')).map(input => input.value).filter(Boolean),
        "Test Steps": JSON.parse(testStepsJson)
    };

    if (currentTestIndex !== undefined) {
        currentTests[currentTestIndex] = test;
        currentTestIndex = undefined;
    } else {
        currentTests.push(test);
    }

    document.getElementById(ELEMENT_IDS.EDITOR_FORM).classList.remove('hidden');
    document.getElementById(ELEMENT_IDS.TEST_EDITOR).classList.add('hidden');
    document.getElementById(ELEMENT_IDS.TEST_STEPS).classList.remove('error');
    document.getElementById(ELEMENT_IDS.JSON_ERROR).classList.add('hidden');

    renderTests(document.getElementById(ELEMENT_IDS.TEST_LIST));
});

document.getElementById('cancel-test').addEventListener('click', () => {
    document.getElementById(ELEMENT_IDS.EDITOR_FORM).classList.remove('hidden');
    document.getElementById(ELEMENT_IDS.TEST_EDITOR).classList.add('hidden');
});

document.getElementById('add-precondition').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'precondition-input';
    document.getElementById(ELEMENT_IDS.PRECONDITIONS_LIST).appendChild(input);
});

document.getElementById('add-postcondition').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'postcondition-input';
    document.getElementById(ELEMENT_IDS.POSTCONDITIONS_LIST).appendChild(input);
});

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

function clearProcedureForm() {
    document.getElementById(ELEMENT_IDS.METADATA_FORM).reset();
    document.getElementById(ELEMENT_IDS.TEST_STEPS).value = '';
    document.getElementById(ELEMENT_IDS.JSON_ERROR).classList.add('hidden');
    document.getElementById(ELEMENT_IDS.JSON_ERROR).value = '';
    document.getElementById(ELEMENT_IDS.TEST_STEPS).classList.remove('error');
}

function clearTestForm() {
    document.getElementById(ELEMENT_IDS.TEST_FORM).reset();
    document.getElementById(ELEMENT_IDS.PRECONDITIONS_LIST).innerHTML = `
    <div class="condition-row">
        <input type="text" class="precondition-input">
    </div>
    `;
    document.getElementById(ELEMENT_IDS.POSTCONDITIONS_LIST).innerHTML = `
        <div class="condition-row">
            <input type="text" class="postcondition-input">
        </div>
    `;
    document.getElementById(ELEMENT_IDS.TEST_STEPS).value = '';
    document.getElementById(ELEMENT_IDS.JSON_ERROR).classList.add('hidden');
    document.getElementById(ELEMENT_IDS.TEST_STEPS).classList.remove('error');
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

function editTest(index) {
    currentTestIndex = index;
    const test = currentTests[index];
    document.getElementById(ELEMENT_IDS.TEST_NAME).value = test["Test Name"];

    const preList = document.getElementById(ELEMENT_IDS.PRECONDITIONS_LIST);
    preList.innerHTML = test["Test Preconditions"]
        .map((pre, i) => `
            <div class="condition-row">
                <input type="text" class="precondition-input" value="${pre}">
                <div class="condition-buttons">
                    <button type="button" onclick="deleteTestPreCondition(${i})" class="button">Delete</button>
                </div>
            </div>
            `)
        .join('');

    const postList = document.getElementById(ELEMENT_IDS.POSTCONDITIONS_LIST);
    postList.innerHTML = test["Test Postconditions"]
        .map((post, i) => `
            <div class="condition-row">
                <input type="text" class="postcondition-input" value="${post}">
                <div class="condition-buttons">
                    <button type="button" onclick="deleteTestPostCondition(${i})" class="button">Delete</button>
                </div>
            </div>
        `)
        .join('');

    document.getElementById(ELEMENT_IDS.TEST_STEPS).value = JSON.stringify(test["Test Steps"], null, 2);
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

function deleteTestPreCondition(index) {
    const inputs = document.querySelectorAll('.precondition-input');
    inputs[index].parentElement.remove();
}

function deleteTestPostCondition(index) {
    const inputs = document.querySelectorAll('.postcondition-input');
    inputs[index].parentElement.remove();
}

function isValidJSON(jsonContent) {
    try {
        JSON.parse(jsonContent);
        return { valid: true };
    } catch (error) {
        const lineMatch = error.message.match(/line (\d+)/i);
        const columnMatch = error.message.match(/column (\d+)/i);
        const line = lineMatch ? parseInt(lineMatch[1], 10) : null;
        const column = columnMatch ? parseInt(columnMatch[1], 10) : null;
        return {
            valid: false,
            message: error.message,
            line: line,
            column: column
        };
    }
}

function highlightError(line, column, textArea) {
    const lines = textArea.value.split('\n');
    let start = 0;
    for (let i = 0; i < line - 1; i++) {
        start += lines[i].length + 1;
    }
    const end = start + column - 1;
    textArea.focus();
    textArea.setSelectionRange(end, end + 1);
    textArea.scrollTop = textArea.scrollHeight;
}