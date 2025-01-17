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
 * @property {string} VARIABLES_LIST - The ID of the variables list element.
 * @property {string} VARIABLES_PANEL - The ID of the variables panel element.
 * @property {string} VARIABLES_LIST_PANEL - The ID of the variables list panel element.
 * @property {string} STEP_REQUIRE_NOTE - The ID of the step require note element.
 * @property {string} STEP_NOTE_PROMPT - The ID of the step note prompt element.
 * @property {string} NOTE_PROMPT_GROUP - The ID of the note prompt group element.
 * @property {string} PANEL_TABS - The ID of the panel tabs element.
 * @property {string} NOTES_LIST_PANEL - The ID of the notes list panel element.
 * @property {string} VARIABLES_TAB - The ID of the variables tab element.
 * @property {string} NOTES_TAB - The ID of the notes tab element.
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
    TEST_STEPS: 'test-steps',
    VARIABLES_LIST: 'variables-list',
    VARIABLES_PANEL: 'variables-panel',
    VARIABLES_LIST_PANEL: 'variables-list-panel',
    STEP_REQUIRE_NOTE: 'step-require-note',
    STEP_NOTE_PROMPT: 'step-note-prompt',
    NOTE_PROMPT_GROUP: 'note-prompt-group',
    PANEL_TABS: 'panel-tabs',
    NOTES_LIST_PANEL: 'notes-list-panel',
    VARIABLES_TAB: 'variables-tab',
    NOTES_TAB: 'notes-tab'
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
    currentSteps = []; // Redundant but safe
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
        "Test Variables": Array.from(document.querySelectorAll('.variable-input')).map(input => input.value).filter(Boolean),
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
    updateInputWithVariableButton(container.querySelector('input'));
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
    updateInputWithVariableButton(container.querySelector('input'));
});

document.getElementById('add-variable').addEventListener('click', () => {
    const container = document.createElement('div');
    container.className = 'condition-row';
    container.innerHTML = `
        <input type="text" class="variable-input" placeholder="Enter variable name">
        <div class="condition-buttons">
            <button type="button" onclick="deleteTestCondition(this)" class="button">Delete</button>
        </div>
    `;
    document.getElementById(ELEMENT_IDS.VARIABLES_LIST).appendChild(container);
    updateInputWithVariableButton(container.querySelector('input'));
});

document.getElementById(ELEMENT_IDS.STEP_FORM).addEventListener('submit', (e) => {
    e.preventDefault();

    const requireNote = document.getElementById(ELEMENT_IDS.STEP_REQUIRE_NOTE).checked;
    const step = {
        step: parseInt(document.getElementById(ELEMENT_IDS.STEP_NUMBER).value, 10),
        stepName: document.getElementById(ELEMENT_IDS.STEP_NAME).value,
        description: document.getElementById(ELEMENT_IDS.STEP_DESCRIPTION).value,
        requireNote: requireNote
    };

    if (requireNote) {
        step.notePrompt = document.getElementById(ELEMENT_IDS.STEP_NOTE_PROMPT).value;
    }

    // Preserve existing referenceNote if it exists
    if (currentStepIndex !== undefined && 
        currentSteps[currentStepIndex] && 
        currentSteps[currentStepIndex].referenceNote) {
        step.referenceNote = currentSteps[currentStepIndex].referenceNote;
    }

    if (currentStepIndex !== undefined) {
        currentSteps[currentStepIndex] = step;
        currentStepIndex = undefined;
    } else {
        currentSteps.push(step);
    }

    currentSteps.sort((a, b) => a.step - b.step);
    renderSteps();
    
    document.getElementById(ELEMENT_IDS.STEP_EDITOR).classList.add('hidden');
    document.getElementById(ELEMENT_IDS.TEST_EDITOR).classList.remove('hidden');
});

document.getElementById('add-step').addEventListener('click', () => {
    clearStepForm();
    document.getElementById(ELEMENT_IDS.TEST_EDITOR).classList.add('hidden');
    document.getElementById(ELEMENT_IDS.STEP_NUMBER).value = currentSteps.length + 1;
    document.getElementById(ELEMENT_IDS.STEP_EDITOR).classList.remove('hidden');
});

document.getElementById('cancel-step').addEventListener('click', () => {
    document.getElementById(ELEMENT_IDS.STEP_EDITOR).classList.add('hidden');
    document.getElementById(ELEMENT_IDS.TEST_EDITOR).classList.remove('hidden');
});

document.getElementById(ELEMENT_IDS.STEP_REQUIRE_NOTE).addEventListener('change', (e) => {
    const promptGroup = document.getElementById(ELEMENT_IDS.NOTE_PROMPT_GROUP);
    promptGroup.classList.toggle('hidden', !e.target.checked);
    if (!e.target.checked) {
        document.getElementById(ELEMENT_IDS.STEP_NOTE_PROMPT).value = '';
    }
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

// Update clearTestForm function
function clearTestForm() {
    document.getElementById(ELEMENT_IDS.TEST_FORM).reset();
    // Clear steps
    currentSteps = [];
    document.getElementById(ELEMENT_IDS.STEP_LIST).innerHTML = '';
    
    document.getElementById(ELEMENT_IDS.PRECONDITIONS_LIST).innerHTML = `
    <div class="input-group">
        <input type="text" class="precondition-input">
        <button type="button" class="button insert-variable-button" onclick="showVariablesPicker(this)">
            <span class="tooltip">Insert Variable</span>
            {{x}}
        </button>
    </div>
    `;
    document.getElementById(ELEMENT_IDS.POSTCONDITIONS_LIST).innerHTML = `
    <div class="input-group">
        <input type="text" class="postcondition-input">
        <button type="button" class="button insert-variable-button" onclick="showVariablesPicker(this)">
            <span class="tooltip">Insert Variable</span>
            {{x}}
        </button>
    </div>
    `;

    document.getElementById(ELEMENT_IDS.VARIABLES_LIST).innerHTML = `
    <div class="condition-row">
        <input type="text" class="variable-input" placeholder="Enter variable name">
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
    stepsList.innerHTML = currentSteps.map((step) => `
        <div class="step-card" data-step-number="${step.step}" data-step-name="${step.stepName}">
            <div class="step-header">
                <span class="step-title">${step.step}: ${step.stepName}</span>
                <div class="test-card-buttons">
                    <button type="button" onclick="editStep(this)" class="button">Edit</button>
                    <button type="button" onclick="deleteStep(this)" class="button">Delete</button>
                </div>
            </div>
            <div class="step-description">${step.description}</div>
            ${step.requireNote ? `
                <div class="step-note-info">
                    <span>📝 Requires note: ${step.notePrompt}</span>
                </div>
            ` : ''}
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
                <div class="input-group">
                    <input type="text" class="precondition-input" value="${pre}">
                    <button type="button" class="button insert-variable-button" onclick="showVariablesPicker(this)">
                        <span class="tooltip">Insert Variable</span>
                        {{x}}
                    </button>
                </div>
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
                <div class="input-group">
                    <input type="text" class="postcondition-input" value="${post}">
                    <button type="button" class="button insert-variable-button" onclick="showVariablesPicker(this)">
                        <span class="tooltip">Insert Variable</span>
                        {{x}}
                    </button>
                </div>
                <div class="condition-buttons">
                    <button type="button" onclick="deleteTestCondition(this)" class="button">Delete</button>
                </div>
            </div>
        `)
        .join('');

    const varList = document.getElementById(ELEMENT_IDS.VARIABLES_LIST);
    varList.innerHTML = (test["Test Variables"] || [])
        .map((variable) => `
            <div class="condition-row">
                <input type="text" class="variable-input" value="${variable}">
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
function editStep(button) {
    const card = button.closest('.step-card');
    const step = currentSteps.find(step => 
        step.step === parseInt(card.dataset.stepNumber) && 
        step.stepName === card.dataset.stepName
    );
    if (!step) return;
    
    // Store step data to be used after view switch
    const stepToEdit = {
        index: currentSteps.indexOf(step),
        ...step
    };
    
    // Switch views first
    document.getElementById(ELEMENT_IDS.TEST_EDITOR).classList.add('hidden');
    document.getElementById(ELEMENT_IDS.STEP_EDITOR).classList.remove('hidden');
    
    // Wait for next event loop to ensure DOM is updated
    requestAnimationFrame(() => {
        initializeStepEditor(stepToEdit);
    });
}

function initializeStepEditor(step) {
    currentStepIndex = step.index;
    
    const stepNumber = document.getElementById(ELEMENT_IDS.STEP_NUMBER);
    const stepName = document.getElementById(ELEMENT_IDS.STEP_NAME);
    const stepDescription = document.getElementById(ELEMENT_IDS.STEP_DESCRIPTION);
    const requireNote = document.getElementById(ELEMENT_IDS.STEP_REQUIRE_NOTE);
    const promptGroup = document.getElementById(ELEMENT_IDS.NOTE_PROMPT_GROUP);
    const notePrompt = document.getElementById(ELEMENT_IDS.STEP_NOTE_PROMPT);
    
    if (stepNumber) stepNumber.value = step.step;
    if (stepName) stepName.value = step.stepName;
    if (stepDescription) stepDescription.value = step.description;
    if (requireNote) requireNote.checked = step.requireNote;
    if (promptGroup) promptGroup.classList.toggle('hidden', !step.requireNote);
    if (notePrompt && step.requireNote) notePrompt.value = step.notePrompt;
}

function deleteStep(button) {
    const card = button.closest('.step-card');
    if (confirm(`Are you sure you want to delete step ${card.dataset.stepName}?`)) {
        currentSteps = currentSteps.filter(step => step.step !== parseInt(card.dataset.stepNumber) && step.stepName !== card.dataset.stepName);
        card.remove();
        renderSteps();
    }
}

// Add new functions for variable handling
function toggleVariablesPanel() {
    const panel = document.getElementById(ELEMENT_IDS.VARIABLES_PANEL);
    const isHiding = !panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    
    // Reset tab state when closing panel
    if (isHiding) {
        resetPanelTabs();
    }
}

function resetPanelTabs() {
    const notesTab = document.getElementById(ELEMENT_IDS.NOTES_TAB);
    notesTab.disabled = false;
    notesTab.classList.remove('disabled');
}

function showVariablesPicker(button) {
    const input = button.previousElementSibling;
    const isConditionInput = input.classList.contains('precondition-input') || 
                            input.classList.contains('postcondition-input');
    
    document.getElementById(ELEMENT_IDS.VARIABLES_PANEL).classList.remove('hidden');
    
    // Highlight the input being edited
    document.querySelectorAll('.input-group input, .input-group textarea').forEach(inp => 
        inp.classList.remove('active-input'));
    input.classList.add('active-input');
    
    // Enable/disable notes tab based on input type
    const notesTab = document.getElementById(ELEMENT_IDS.NOTES_TAB);
    notesTab.disabled = isConditionInput;
    notesTab.classList.toggle('disabled', isConditionInput);
    
    // Switch to variables tab if notes tab is disabled
    if (isConditionInput) {
        switchPanelTab('variables');
    }
    
    renderAvailableVariables();
}

function renderAvailableVariables() {
    const variablesList = document.getElementById(ELEMENT_IDS.VARIABLES_LIST_PANEL);
    const variables = [];
    
    // Fix: Variables should be available when adding a new test
    const testIndex = currentTestIndex === undefined ? currentTests.length : currentTestIndex;
    
    // Collect variables with their source test index
    currentTests.forEach((test, index) => {
        if (test["Test Variables"]) {
            test["Test Variables"].forEach(v => {
                variables.push({
                    name: v,
                    sourceIndex: index,
                    // Fix: Make variables available for new tests
                    available: index <= testIndex
                });
            });
        }
    });
    
    // Add variables from current test form
    Array.from(document.querySelectorAll('.variable-input'))
        .map(input => input.value)
        .filter(Boolean)
        .forEach(v => {
            variables.push({
                name: v,
                sourceIndex: testIndex,
                available: true
            });
        });
    
    // Render variables list with proper availability check
    variablesList.innerHTML = variables
        .filter((v, i, arr) => arr.findIndex(item => item.name === v.name) === i) // Remove duplicates
        .sort((a, b) => a.sourceIndex - b.sourceIndex)
        .map(variable => `
            <div class="variable-item ${variable.available ? '' : 'disabled'}"
                 ${variable.available ? `onclick="insertVariable('${variable.name}')"` : ''}
                 title="${variable.available ? 'Click to insert' : 'Variable not available - defined in a later test'}">
                {{${variable.name}}}
            </div>
        `).join('');
}

function insertVariable(variable) {
    const activeInput = document.querySelector('.active-input');
    if (!activeInput) return;
    
    const cursorPos = activeInput.selectionStart;
    const textBefore = activeInput.value.substring(0, cursorPos);
    const textAfter = activeInput.value.substring(cursorPos);
    
    activeInput.value = `${textBefore}{{${variable}}}${textAfter}`;
    activeInput.classList.remove('active-input');
    document.getElementById(ELEMENT_IDS.VARIABLES_PANEL).classList.add('hidden');
}

// Update test form inputs to use input groups
function updateInputWithVariableButton(input) {
    const group = document.createElement('div');
    group.className = 'input-group';
    input.parentNode.insertBefore(group, input);
    group.appendChild(input);
    
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'insert-variable-button';
    button.innerHTML = `
        <span class="tooltip">Insert Variable</span>
        {{x}}
    `;
    button.onclick = () => showVariablesPicker(button);
    group.appendChild(button);
}

function switchPanelTab(tab) {
    document.getElementById(ELEMENT_IDS.VARIABLES_TAB).classList.toggle('active', tab === 'variables');
    document.getElementById(ELEMENT_IDS.NOTES_TAB).classList.toggle('active', tab === 'notes');
    document.getElementById(ELEMENT_IDS.VARIABLES_LIST_PANEL).classList.toggle('hidden', tab !== 'variables');
    document.getElementById(ELEMENT_IDS.NOTES_LIST_PANEL).classList.toggle('hidden', tab !== 'notes');
    
    if (tab === 'variables') {
        renderAvailableVariables();
    } else {
        renderAvailableNotes();
    }
}

function showNotePicker(button) {
    const input = button.previousElementSibling;
    document.getElementById(ELEMENT_IDS.VARIABLES_PANEL).classList.remove('hidden');
    
    document.querySelectorAll('.input-group textarea').forEach(inp => 
        inp.classList.remove('active-input'));
    input.classList.add('active-input');
    
    // Enable notes tab for step description
    const notesTab = document.getElementById(ELEMENT_IDS.NOTES_TAB);
    notesTab.disabled = false;
    notesTab.classList.remove('disabled');
    
    switchPanelTab('notes');
}

function renderAvailableNotes() {
    const notesList = document.getElementById(ELEMENT_IDS.NOTES_LIST_PANEL);
    const notes = [];
    
    // Fix: Use same logic as variables for new tests
    const testIndex = currentTestIndex === undefined ? currentTests.length : currentTestIndex;
    
    // Get notes from previous tests
    for (let i = 0; i < testIndex; i++) {
        const test = currentTests[i];
        if (test["Test Steps"]) {
            test["Test Steps"]
                .filter(step => step.requireNote)
                .forEach(step => {
                    notes.push({
                        testName: test["Test Name"],
                        stepName: step.stepName,
                        prompt: step.notePrompt,
                        available: true
                    });
                });
        }
    }
    
    // Get notes from current test's previous steps
    if (currentTestIndex !== undefined) {
        const currentStepNumber = parseInt(document.getElementById(ELEMENT_IDS.STEP_NUMBER).value, 10);
        currentSteps
            .filter(step => step.requireNote && step.step < currentStepNumber)
            .forEach(step => {
                notes.push({
                    testName: currentTests[currentTestIndex]["Test Name"],
                    stepName: step.stepName,
                    prompt: step.notePrompt,
                    available: true
                });
            });
    }
    
    notesList.innerHTML = notes.map(note => `
        <div class="note-item" onclick="insertNoteReference('${note.testName}', '${note.stepName}')">
            <div class="note-item-title">${note.testName} - ${note.stepName}</div>
            <div class="note-item-prompt">${note.prompt}</div>
        </div>
    `).join('');
}

function insertNoteReference(testName, stepName) {
    const activeInput = document.querySelector('.active-input');
    if (!activeInput) return;
    
    const cursorPos = activeInput.selectionStart;
    const textBefore = activeInput.value.substring(0, cursorPos);
    const textAfter = activeInput.value.substring(cursorPos);
    
    activeInput.value = `${textBefore}[[note]]${textAfter}`;
    
    // Add reference to current step
    if (currentStepIndex !== undefined) {
        if (!currentSteps[currentStepIndex]) {
            currentSteps[currentStepIndex] = {};
        }
        currentSteps[currentStepIndex].referenceNote = {
            testName: testName,
            stepName: stepName
        };
    }
    
    activeInput.classList.remove('active-input');
    document.getElementById(ELEMENT_IDS.VARIABLES_PANEL).classList.add('hidden');
}

// Update step editor form to include note picker button
document.getElementById(ELEMENT_IDS.STEP_DESCRIPTION).parentElement.innerHTML = `
    <div class="input-group">
        <textarea id="${ELEMENT_IDS.STEP_DESCRIPTION}" required></textarea>
        <button type="button" class="button insert-variable-button" onclick="showNotePicker(this)">
            <span class="tooltip">Insert Note Reference</span>
            [[N]]
        </button>
    </div>
`;