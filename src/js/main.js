/**
* Represents a custom HTML element for a step in a test.
* This element uses a shadow DOM to encapsulate its internal structure and style.
* 
* @class StepElement
* @extends {HTMLElement}
* 
* @property {string} stepName - The name of the step.
* @property {string} stepDescription - The description of the step.
* @property {HTMLElement} nextButton - Reference to the "Next Step" button.
* @property {HTMLElement} terminateButton - Reference to the "Terminate Run" button.
* 
* @method connectedCallback - Called when the element is added to the DOM. Initializes the shadow DOM and updates its content.
* @method set stepData(data) - Sets the step data including name and description.
* @method get status() - Gets the status of the step from the selected input.
* @method get comment() - Gets the comment from the input field.
*/
class StepElement extends HTMLElement {
    constructor() {
        //Don't do anything in here, do it in connectedCallback. Any code in
        // here can ONLY manipulate the shadow DOM, not the light DOM.
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        //Get the HTML template fragment and append it to our shadow DOM
        const template = document.getElementById('step-template').content;
        this.shadowRoot.appendChild(template.cloneNode(true));

        //Update the content of the shadow DOM copy with this element's info
        this.shadowRoot.querySelector('h3').textContent = `${this.stepName}`;
        this.shadowRoot.querySelector('p').textContent = `${this.stepDescription}`;

        //Get references to the buttons for later use
        this.nextButton = this.shadowRoot.querySelector('.next-step');
        this.terminateButton = this.shadowRoot.querySelector('.terminate-run');

    }
    /**
    * @param {{ stepName: string, description: string }} data
    */
    set stepData(data) {
        this.stepName = data.stepName;
        this.stepDescription = data.description;
    }
    /**
    * @returns {string}
    */
    get status() {
        const selected = this.shadowRoot.querySelector('input[name="status"]:checked');
        if (selected) {
            return selected.id;
        } else {
            console.error('No status selected');
            return undefined;
        }
    }
    /**
    * @returns {string}
    */
    get comment() {
        return this.shadowRoot.querySelector('.comment').value;
    }
}
// Add the StepElement to the custom elements registry, allowing us to use it in our HTML
// like a normal element -- <step-element></step-element>
customElements.define('step-element', StepElement);

// Get references to all the things we need to interact with
const fileInput = document.getElementById('file-input');
const loadButton = document.querySelector('.load-button');
const content = document.getElementById('content');
const statsBody = document.getElementById('stats-body');
const statistics = document.getElementById('statistics');

// State data
var tests = [];
let currentTestIndex = 0;
let currentStepIndex = 0;
let testProcedure = {};

//Display the file selected by the user

// Add file input change listener
document.getElementById('file-input').addEventListener('change', function (e) {
    const filenameDisplay = document.getElementById('filename-display');
    filenameDisplay.textContent = this.files[0] ? this.files[0].name : '';
});

//Process the file selected by the user
loadButton.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            testProcedure = JSON.parse(e.target.result);
            tests = testProcedure.Tests;
            showTestProcedure(testProcedure);
        };
        reader.readAsText(file);
    } else {
        alert('Please select a file to load');
    }
});

let selectedTests = [];

/**
* Displays the test procedure details on the page.
*
* @param {Object} data - The data object containing test procedure details.
* @param {string} data["Test Procedure"] - The title of the test procedure.
* @param {string} data.Updated - The date when the test procedure was last updated.
* @param {string} data.Author - The author of the test procedure.
* @param {string} data.Description - A description of the test procedure.
*
* @example
* const data = {
*   "Test Procedure": "Procedure 1",
*   Updated: "2023-10-01",
*   Author: "John Doe",
*   Description: "This is a test procedure description."
*   "Tests" : [...]
* };
* showTestProcedure(data);
*/
function showTestProcedure(data) {
    content.innerHTML = `
        <h2>Test Procedure</h2>
        <p><strong>Updated:</strong> ${data.Updated}</p>
        <p><strong>Author:</strong> ${data.Author}</p>
        <p><strong>Description:</strong> ${data.Description}</p>
        <h3>Select Tests to Run</h3>
        <div class="test-selection">
            ${tests.map((test, index) => `
                <div class="test-checkbox">
                    <input type="checkbox" id="test-${index}" checked>
                    <label for="test-${index}">${test["Test Name"]}</label>
                </div>
            `).join('')}
        </div>
        <button id="continue-button" class="button">Continue</button>
    `;

    const checkboxes = document.querySelectorAll('.test-checkbox input');
    const beginButton = document.getElementById('continue-button');

    // Initialize selectedTests
    selectedTests = tests.map((_, index) => index);

    // Handle checkbox changes
    checkboxes.forEach((checkbox, index) => {
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                selectedTests.push(index);
            } else {
                selectedTests = selectedTests.filter(i => i !== index);
            }
            beginButton.disabled = selectedTests.length === 0;
        });
    });

    beginButton.addEventListener('click', () => {
        if (selectedTests.length === 0) {
            alert('Please select at least one test to run');
            return;
        }
        currentTestIndex = 0;
        currentStepIndex = 0;
        showTest(currentTestIndex);
    });
}

/**
* Displays the test details and handles the test execution flow.
*
* @param {number} index - The index of the test to display.
* @returns {void}
*
* @description
* This function displays the details of a test, including its preconditions and postconditions.
* It collects necessary variables, replaces placeholders in the conditions, and updates the content
* of the page with the test details. It also sets up an event listener on the "Begin" button to start
* the test steps.
*
* @example
* // Assuming `tests` is an array of test objects and `content` is a DOM element
* showTest(0);
*/
function showTest(index) {
    if (typeof index !== 'number' || index < 0 || index >= selectedTests.length) {
        console.error('Invalid index:', index);
        content.innerHTML = `<p>Invalid test index. Please select a valid test.</p>`;
        return;
    }
    const test = tests[selectedTests[index]];

    //Collect and handle variables
    collectVariables(test).then(() => {
        const preconditions = test["Test Preconditions"].map(replaceVariables);
        const postconditions = test["Test Postconditions"].map(replaceVariables);

        content.innerHTML = `
    <h2>${test["Test Name"]}</h2>
    <p><strong>Preconditions:</strong></p>
    <ul>${preconditions.map(cond => `<li>${cond}</li>`).join('')}</ul>
    <p><strong>Postconditions:</strong></p>
    <ul>${postconditions.map(cond => `<li>${cond}</li>`).join('')}</ul>
    <button id="begin-button">Begin</button>
    `;

        document.getElementById('begin-button').addEventListener('click', () => {
            showStep(0);
        });
    })
        .catch((error) => {
            console.error('Error collecting variables:', error);
            content.innerHTML = `<p>Error loading test details. Please try again later.</p>`;
        });
}

/**
* Displays the test details for the given index.
* 
* This function retrieves the test at the specified index from the `tests` array,
* collects and handles variables, and then displays the test name, preconditions,
* and postconditions in the `content` element. It also sets up an event listener
* on the "Begin" button to start the test steps.
* 
* @param {number} index - The index of the test to display.
* @returns {void}
* 
* @example
* showTest(0);
*/
function showStep(index) {
    const currentTest = tests[selectedTests[currentTestIndex]];
    content.innerHTML = '';
    if (!currentTest) {
        showStatistics();
    } else if (index < currentTest["Test Steps"].length && index >= 0) {
        // Add the step name
        const testHeader = document.createElement('h2');
        testHeader.textContent = currentTest["Test Name"];
        content.appendChild(testHeader);

        //Create and configure step element
        const stepElement = document.createElement('step-element');
        const stepData = { ...currentTest["Test Steps"][index] };
        stepData.description = replaceVariables(stepData.description);
        stepElement.stepData = stepData;

        //Add the new element to the page
        content.appendChild(stepElement);

        //Add event listeners to the buttons
        stepElement.nextButton.addEventListener('click', () => {
            recordStepStatus(stepElement).then(recorded => {
                if (!recorded) stepElement.status = 'not-run';
                
                const currentStep = currentTest["Test Steps"][index];
                if (currentStep.requireNote) {
                    const modal = document.getElementById('create-note-modal');
                    const title = document.getElementById('note-title');
                    const content = document.getElementById('note-content');
                    const prompt = document.querySelector('.note-prompt');

                    title.value = `${currentTest["Test Name"]} - ${currentStep.stepName}`;
                    content.value = '';
                    prompt.textContent = currentStep.notePrompt || '';
                    prompt.style.display = currentStep.notePrompt ? 'block' : 'none';

                    modal.classList.add('open');
                    modal.dataset.nextStep = index + 1;
                } else {
                    showStep(index + 1);
                }
            });
        });
        stepElement.terminateButton.addEventListener('click', () => {
            recordStepStatus(stepElement).then(recorded => {
                if (!recorded) return;
                currentTestIndex = selectedTests.length;
                currentStepIndex = 0;
                showStatistics();
            });
        });
    } else {
        currentTestIndex++;
        currentStepIndex = 0;
        if (currentTestIndex < selectedTests.length) {
            showTest(currentTestIndex);
        } else {
            showStatistics();
        }
    }
}

/**
* Updates the status and comment of the current test step and increments the step index.
*
* @param {Object} stepElement - The element containing the status and comment of the test step.
* @param {string} stepElement.status - The status of the test step.
* @param {string} stepElement.comment - The comment for the test step.
* 
* @modifies {number} currentStepIndex - Increments the global currentStepIndex variable.
*
* @throws {Error} If the current test or step index is out of bounds.
*/
function recordStepStatus(stepElement) {
    const selectedTest = tests[selectedTests[currentTestIndex]];
    if (currentStepIndex < selectedTest["Test Steps"].length) {
        let status = stepElement.status;
        const currentStep = selectedTest["Test Steps"][currentStepIndex];
        let comment = stepElement.comment;

        //Handle referenced notes
        if (currentStep.referenceNote) {
            const noteContent = getNoteContent(
                currentStep.referenceNote.testName,
                currentStep.referenceNote.stepName
            );
            if (comment) comment += '\n';
            comment += `Test Data from previous step: ${noteContent}`;
        }

        if (!status) {
            return new Promise((resolve) => {
                const modal = document.getElementById('status-modal');
                modal.classList.add('open');
                
                const confirmButton = document.getElementById('confirm-status');
                const cancelButton = document.getElementById('cancel-status');
                
                const handleConfirm = () => {
                    const selected = document.querySelector('input[name="modal-status"]:checked');
                    if (selected) {
                        modal.classList.remove('open');
                        cleanup();
                        const status = selected.value;
                        selectedTest["Test Steps"][currentStepIndex] = {
                            ...selectedTest["Test Steps"][currentStepIndex],
                            status,
                            comment: stepElement.comment
                        };
                        currentStepIndex++;
                        resolve(true);
                    }
                };
                
                const handleCancel = () => {
                    modal.classList.remove('open');
                    cleanup();
                    resolve(false);
                };
                
                const cleanup = () => {
                    confirmButton.removeEventListener('click', handleConfirm);
                    cancelButton.removeEventListener('click', handleCancel);
                    document.querySelectorAll('input[name="modal-status"]')
                        .forEach(radio => radio.checked = false);
                };
                
                confirmButton.addEventListener('click', handleConfirm);
                cancelButton.addEventListener('click', handleCancel);
            });
        }
        selectedTest["Test Steps"][currentStepIndex] = {
            ...selectedTest["Test Steps"][currentStepIndex],
            status,
            comment
        };
        currentStepIndex++;
        return Promise.resolve(true);
    } else {
        console.error('Step index out of bounds');
        return Promise.resolve(false);
    }
}

/**
* Displays the test run statistics and details in the content area.
* 
* This function clears the current content and appends the statistics summary and details.
* It calculates the pass rate of the tests and displays a summary with an option to toggle
* the visibility of detailed test steps.
* 
* @remarks
* - The function assumes the existence of global variables `content`, `statistics`, `statsBody`, and `tests`.
* - The `tests` variable should be an array of test objects, each containing a "Test Name" and "Test Steps".
* - Each "Test Step" should have a `status` and optionally a `comment`.
* 
* @example
* // Example structure of the `tests` array:
* const tests = [
*   {
*     "Test Name": "Test 1",
*     "Test Steps": [
*       { stepName: "Step 1", status: "Pass", comment: "All good" },
*       { stepName: "Step 2", status: "Fail", comment: "Something went wrong" }
*     ]
*   },
*   {
*     "Test Name": "Test 2",
*     "Test Steps": [
*       { stepName: "Step 1", status: "Pass" },
*       { stepName: "Step 2", status: "Pass" }
*     ]
*   }
* ];
*/
function showStatistics() {
    //Validate state and data
    if (!content || !statistics || !statsBody || !tests || tests.length === 0) {
        console.error('Missing required elements or data.');
        return;
    }

    //Prepare to display statistics
    content.innerHTML = '';
    content.appendChild(statistics);
    statistics.classList.remove('hidden');

    //Clear existing table body
    let table_body = statsBody.querySelector('tbody');
    if (!table_body) {
        table_body = document.createElement('tbody');
        statsBody.appendChild(table_body);
    }
    table_body.innerHTML = '';

    //Count Steps
    let passCount = 0;
    let totalSteps = 0;

    selectedTests.forEach(testIndex => {
        const test = tests[testIndex];
        if (!test["Test Steps"] || !Array.isArray(test["Test Steps"]) || test["Test Steps"].length === 0) {
            console.error(`Test steps are missing or not an array for test: ${test["Test Name"]}`);
            return;
        }
        test["Test Steps"].forEach(step => {
            if (step.status === 'Pass') {
                passCount++;
            }
        });
        totalSteps += test["Test Steps"].length;
    });

    if (totalSteps === 0) {
        //No steps to display
        console.error('No test steps found.');
        return;
    }

    //Calculate and display pass rate
    const passRate = (passCount / totalSteps) * 100;
    const summary = document.createElement('div');
    summary.innerHTML = `
        <h2>Test Summary</h2>
        ${selectedTests.length < tests.length ?
            `<p class="partial-run-notice">Completed ${selectedTests.length} of ${tests.length} total tests</p>`
            : ''}
        <p>Pass Rate: ${passRate.toFixed(2)}%</p>
        <button id="toggle-details">Show Details</button>
        <button id="print-report-button" class="button">Print Report</button>
    `;
    content.appendChild(summary);

    //Prepare test details nodes
    const details = document.createElement('div');
    details.id = 'details';
    details.classList.add('hidden');

    //Create and append table header
    const testHeader = document.createElement('tr');
    testHeader.innerHTML = '<th colspan="3">Tests Run</th>';
    statsBody.appendChild(testHeader);

    //Create and append table body
    selectedTests.forEach((testIndex) => {
        const test = tests[testIndex];
        const testRow = document.createElement('tr');
        const testStatus = test["Test Steps"].some(step => step.status === 'Fail') ? 'Fail' : test["Test Steps"].some(step => step.status === undefined) ? 'not-run' : 'Pass';
        const overallStatus = testStatus === 'Pass' ? 'Pass' : testStatus === 'Fail' ? 'Fail' : 'Not Run';
        testRow.classList.add(testStatus === 'Pass' ? 'pass' : testStatus === 'not-run' ? 'not-run' : 'fail');
        testRow.classList.add('test-details');
        testRow.innerHTML = `
        <td>${test["Test Name"]}</td>
        <td>${overallStatus}</td>
        <td><button class="toggle-steps">Show Steps</button></td>
    `;
        statsBody.appendChild(testRow);
        //Create and append test steps
        const stepContainer = document.createElement('div');
        stepContainer.classList.add('step-container');
        const stepTable = document.createElement('table');
        const testHeaderRow = document.createElement('tr');
        testHeaderRow.innerHTML = `
            <th>Step</th>
            <th>Status</th>
            <th>Comment</th>
        `;
        Array.from(testHeaderRow.children).forEach((child) => { child.classList.add('test-step-header'); });
        stepTable.appendChild(testHeaderRow);
        //Add steps to the table
        test["Test Steps"].forEach((step) => {
            const stepStatus = step.hasOwnProperty('status') ? step.status : 'Not Applicable';
            const stepComment = step.hasOwnProperty('comment') ? step.comment : 'Not Applicable';
            const stepRow = document.createElement('tr');
            stepRow.classList.add('step-details');
            stepRow.classList.add(stepStatus === 'Fail' ? 'fail' : stepStatus === 'Pass' ? 'pass' : 'not-run');
            stepRow.innerHTML = `
                <td>${step.stepName}</td>
                <td>${stepStatus}</td>
                <td class="comment">${stepComment}</td>
            `;
            stepTable.appendChild(stepRow);
        });

        //Add the step table to the step container
        stepContainer.appendChild(stepTable);
        const stepTableRow = document.createElement('tr');
        stepTableRow.appendChild(document.createElement('td'));
        stepTableRow.querySelector('td').colSpan = 3;
        stepTableRow.querySelector('td').appendChild(stepContainer);
        stepTableRow.classList.add('hidden')
        statsBody.appendChild(stepTableRow);

        //Add event listener to toggle step visibility
        testRow.querySelector('.toggle-steps').addEventListener('click', () => {
            stepTableRow.classList.toggle('hidden');
            const button = testRow.querySelector('.toggle-steps');
            button.textContent = stepTableRow.classList.contains('hidden') ? 'Show Steps' : 'Hide Steps';
        });
    });

    //Add the details to the content area
    details.appendChild(statsBody);
    content.appendChild(details);

    //Add event listener to toggle details visibility
    document.getElementById('toggle-details').addEventListener('click', () => {
        details.classList.toggle('hidden');
        const button = document.getElementById('toggle-details');
        button.textContent = details.classList.contains('hidden') ? 'Show Details' : 'Hide Details';
    });

    //Add event listener to print report button
    document.getElementById('print-report-button').addEventListener('click', printReport);
}

//Handle variables in tests
const testVariables = new Map();

/**
* Collects variables required for a test by dynamically generating a form.
* 
* @param {Object} test - The test object containing the variables.
* @param {Array<string>} test["Test Variables"] - An array of variable names required for the test.
* @returns {Promise<void>} A promise that resolves when the form is submitted and variables are collected.
* 
* @example
* const test = {
*   "Test Variables": ["variable1", "variable2"]
* };
* collectVariables(test).then(() => {
*   console.log("Variables collected");
* });
*/
function collectVariables(test) {
    return new Promise((resolve, reject) => {
        const variables = test["Test Variables"];
        if (!variables || variables.length === 0) {
            resolve();
            return;
        }

        const modal = document.getElementById('variables-modal');
        const form = modal.querySelector('#variable-form');
        const inputsContainer = modal.querySelector('.variable-inputs');

        inputsContainer.innerHTML = variables.map(v => `
            <div class="variable-input">
                <label for="${v}">${v}</label>
                <input type="text" id="${v}" name="${v}" required>
            </div>
        `).join('');

        modal.classList.add('open');

        const handleSubmit = (e) => {
            e.preventDefault();
            testVariables.clear();
            variables.forEach(v => {
                const input = document.getElementById(v);
                if (input) {
                    testVariables.set(v, input.value);
                }
            });
            modal.classList.remove('open');
            form.removeEventListener('submit', handleSubmit);
            document.getElementById('cancel-variables').removeEventListener('click', handleCancel);
            resolve();
        };

        const handleCancel = () => {
            modal.classList.remove('open');
            form.removeEventListener('submit', handleSubmit);
            document.getElementById('cancel-variables').removeEventListener('click', handleCancel);
            reject(new Error('Variables collection cancelled'));
        };

        form.addEventListener('submit', handleSubmit);
        document.getElementById('cancel-variables').addEventListener('click', handleCancel);
    });
}

/**
* Replaces variables in the given text with their corresponding values from the `testVariables` map.
* Variables in the text should be in the format {{variableName}}.
*
* @param {string} text - The input text containing variables to be replaced.
* @returns {string} - The text with variables replaced by their corresponding values from the `testVariables` map.
*                     If a variable does not have a corresponding value, it remains unchanged in the text.
*                     If the input text is null or undefined, it returns the input as is.
*
* @example
* const testVariables = new Map([['name', 'John'], ['age', '30']]);
* const result = replaceVariables('Hello, {{name}}! You are {{age}} years old.');
* console.log(result); // Output: 'Hello, John! You are 30 years old.'
*/
function replaceVariables(text) {
    if (!text) {
        //Input is null or undefined
        return text;
    }
    
    // First replace test variables
    text = text.replace(/{{([\w\s]+)}}/g, (match, variable) => {
        if (testVariables && testVariables.size > 0) {
            if (testVariables.has(variable)) {
                return testVariables.get(variable);
            }
        }
        return match;
    });
    
    // Then replace note references
    const selectedTest = tests[selectedTests[currentTestIndex]];
    const currentStep = selectedTest["Test Steps"][currentStepIndex];
    
    if (currentStep.referenceNote) {
        text = text.replace(/\[\[note\]\]/g, () => {
            return getNoteContent(
                currentStep.referenceNote.testName,
                currentStep.referenceNote.stepName
            );
        });
    }
    
    return text;
}

/**
* Generates a printable report of the test session.
*
* This function creates a new window with the test session details formatted for printing.
* The report includes the test procedure details, test steps, their status, and a space for the tester to sign.
*
* @returns {void}
*/
function printReport() {
    const reportWindow = window.open('', '_blank');
    const reportContent = `
        <html>
        <head>
            <title>Test Report</title>
            <link rel="stylesheet" type="text/css" href="css/main.css">
        </head>
        <body>
            <div class="report-header">
                <h1>Manual Test Report</h1>
                <p>Procedure Run Date: ${new Date().toLocaleString()}</p>
            </div>
            <div class="report-section">
                <h2>Test Procedure Details</h2>
                <p><strong>Procedure:</strong> ${testProcedure["Test Procedure"]}</p>
                <p><strong>Author:</strong> ${testProcedure["Author"]}</p>
                <p><strong>Description:</strong> ${testProcedure["Description"]}</p>
            </div>
            <div class="report-section">
                <h2>Test Results</h2>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Test Name</th>
                            <th>Step</th>
                            <th>Status</th>
                            <th>Comment</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${selectedTests.map(testIndex => {
        const test = tests[testIndex];
        return test["Test Steps"].map((step, stepIndex) => `
                                            <tr>
                                                <td>${test["Test Name"]}</td>
                                                <td>${step.stepName}</td>
                                                <td>${step.status || 'N/A'}</td>
                                                <td>${step.comment || ''}</td>
                                            </tr>
                                        `).join('');
    }).join('')}
                    </tbody>
                </table>
            </div>
            <div class="signature">
                <p>Tester Signature: ___________________________</p>
            </div>
            <div class="report-section">
                <h2>Test Notes</h2>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Context</th>
                            <th>Content</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${notes.sort((a, b) => new Date(a.date) - new Date(b.date)).map(note => `
                            <tr>
                                <td>${new Date(note.date).toLocaleDateString()}</td>
                                <td>${note.context}</td>
                                <td>${note.content}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </body>
        </html>
    `;
    reportWindow.document.write(reportContent);
    reportWindow.document.close();
    reportWindow.print();
}

//Note Management
const notes = JSON.parse(localStorage.getItem('wtf-notes') || '[]');

function saveNotes() {
    localStorage.setItem('wtf-notes', JSON.stringify(notes));
}

function addNote(title, content, context, isAutomatic = false) {
    const note = {
        id: Date.now(),
        title,
        content,
        context: context || 'Home',
        date: new Date().toISOString(),
        isAutomatic
    };
    notes.unshift(note);
    saveNotes();
    renderNotes();
}

function deleteNote(id) {
    const index = notes.findIndex(note => note.id == id);
    if (index >= -1) {
        notes.splice(index, 1);
        saveNotes();
        renderNotes();
    }
}

function renderNotes() {
    const container = document.getElementById('notes-list');
    container.innerHTML = notes.map(note => `
        <div class="note-card ${note.isAutomatic ? 'automatic' : ''}" data-id="${note.id}">
            <h3>${note.title}</h3>
            <div class="context">
                <span>${note.context}</span>
                <span>${new Date(note.date).toLocaleString('en-GB', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }).replace(/\//g, '-')}</span>
            </div>
            <div class="content">${note.content}</div>
            <button class="delete-note">Delete</button>
            <button class="view-note">View</button>
        </div>
    `).join('');
}

//Initalise Sidebar
document.querySelector('.sidebar-toggle').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('open');
});

document.getElementById('new-note').addEventListener('click', () => {
    const modal = document.getElementById('create-note-modal');
    const prompt = document.querySelector('.note-prompt');
    prompt.textContent = '';
    prompt.style.display = 'none';
    modal.classList.add('open');
});

document.getElementById('save-note').addEventListener('click', () => {
    const title = document.getElementById('note-title').value;
    const content = document.getElementById('note-content').value;
    const modal = document.getElementById('create-note-modal');

    if (title && content) {
        let context = 'Manual Note';
        let isAutomatic = false;
        if (modal.dataset.nextStep && selectedTests && selectedTests.length > 0 && currentTestIndex < selectedTests.length) {
            const selectedTest = tests[selectedTests[currentTestIndex]];
            const currentStep = selectedTest["Test Steps"][parseInt(modal.dataset.nextStep)-1];
            context = `${selectedTest["Test Name"]} - ${currentStep.stepName}`;
            isAutomatic = true;

            //Update step comment with note content
            const existingComment = currentStep.comment || '';
            currentStep.comment = existingComment ? `${existingComment}\nTest Data: ${content}` : `Test Data: ${content}`;
        } else if (!document.getElementById('statistics').classList.contains('hidden')){
            context = 'Statistics View';
        } else {
            const selectedTest = tests[selectedTests[currentTestIndex]];
            const currentStep =selectedTest["Test Steps"][currentStepIndex];
            context = `${selectedTest["Test Name"]} - ${currentStep.stepName}`;
        }
        addNote(title, content, context, isAutomatic);
        modal.classList.remove('open');
        document.getElementById('note-title').value = '';
        document.getElementById('note-content').value = '';

        if (modal.dataset.nextStep) {
            showStep(parseInt(modal.dataset.nextStep));
            modal.dataset.nextStep = '';
        }
    }
});

document.getElementById('cancel-note').addEventListener('click', () => {
    document.getElementById('create-note-modal').classList.remove('open');
});

document.getElementById('notes-list').addEventListener('click', (e) => {
    const noteCard = e.target.closest('.note-card');
    if (!noteCard) return;

    if (e.target.classList.contains('delete-note')) {
        deleteNote(parseInt(noteCard.dataset.id));
    } else if (e.target.classList.contains('view-note')) {
        const note = notes.find(note => note.id === parseInt(noteCard.dataset.id));
        if (note) {
            const modal = document.getElementById('view-note-modal');
            modal.innerHTML = `
                <div class="modal-content">
                    <h2>${note.title}</h2>
                    <div class="context">
                        <span>${note.context}</span>
                        <span>${new Date(note.date).toLocaleString('en-GB', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false
                        }).replace(/\//g, '-')}</span>
                    </div>
                    <div class="content">${note.content}</div>
                    <button onclick="document.getElementById('view-note-modal').classList.remove('open')">Close</button>
                </div>
            `;
            modal.classList.add('open');
        }
    }
});

function getNoteContent(testName, stepName) {
    const note = notes.find(note => 
        note.context === `${testName} - ${stepName}`
    );
    return note ? note.content : 'N/A';
}

renderNotes();