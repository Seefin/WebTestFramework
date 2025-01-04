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
        this.shadowRoot.querySelector('h2').textContent = `${this.stepName}`;
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
        return this.shadowRoot.querySelector('input[name="status"]:checked').id;
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

//Process the file selected by the user
loadButton.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = JSON.parse(e.target.result);
            tests = data.Tests;
            showTestProcedure(data);
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
    content.innerHTML = '';
    if (!tests[currentTestIndex]){
        showStatistics();
    } else if (index < tests[currentTestIndex]["Test Steps"].length && index >= 0) {
        // Add the step name
        const testHeader = document.createElement('h2');
        testHeader.textContent = tests[currentTestIndex]["Test Name"];
        content.appendChild(testHeader);
        
        //Create and configure step element
        const stepElement = document.createElement('step-element');
        const stepData = { ...tests[currentTestIndex]["Test Steps"][index] };
        stepData.description = replaceVariables(stepData.description);
        stepElement.stepData = stepData;
        
        //Add the new element to the page
        content.appendChild(stepElement);
        
        //Add event listeners to the buttons
        stepElement.nextButton.addEventListener('click', () => {
            recordStepStatus(stepElement);
            showStep(index + 1);
        });
        stepElement.terminateButton.addEventListener('click', () => {
            recordStepStatus(stepElement);
            showStatistics();
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
    // Check if the current step index is within the bounds of the test steps array
    if (currentStepIndex < tests[currentTestIndex]["Test Steps"].length) {
        // Get the status and comment from the step element
        const status = stepElement.status;
        const comment = stepElement.comment;
        
        // Update the status and comment of the current test step
        tests[currentTestIndex]["Test Steps"][currentStepIndex].status = status;
        tests[currentTestIndex]["Test Steps"][currentStepIndex].comment = comment;
        
        // Increment the current step index to move to the next step
        currentStepIndex++;
    } else {
        // Log an error if the step index is out of bounds
        console.error('Step index out of bounds');
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
    
    //Count Passed Steps
    let passCount = 0;
    tests.forEach(test => {
        if (!test["Test Steps"] || !Array.isArray(test["Test Steps"]) || test["Test Steps"].length === 0) {
            console.error(`Test steps are missing or not an array for test: ${test["Test Name"]}`);
            return;
        }
        test["Test Steps"].forEach(step => {
            if (step.status === 'Pass') {
                passCount++;
            }
        });
    });
    
    //Calculate total steps
    const totalSteps = tests.reduce((acc, test) => {
        if (Array.isArray(test["Test Steps"])) {
            return acc + test["Test Steps"].length;
        }
        return acc;
    }, 0);
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
    `;
    content.appendChild(summary);
    
    //Prepare test details nodes
    const details = document.createElement('div');
    details.id = 'details';
    details.classList.add('hidden');
    
    //Create and append table header
    const testHeader = document.createElement('tr');
    testHeader.innerHTML = '<th colspan="3">Tests Run</th>';
    const testStatus =  tests.forEach(test => { test["Test Steps"].some(step => step.status === 'Fail') ? 'Fail' : test["Test Steps"].some(step => step.status === undefined || step.status === 'Not Applicable') ? 'not-run' : 'Pass'});
    
    //Create and append table body
    tests.forEach((test) => {
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
                    <td>${stepComment}</td>
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
    if (!test["Test Variables"] || !Array.isArray(test["Test Variables"])) {
        //This test has no variables
        return Promise.resolve();
    }
    
    //Create a form to collect variables from the user
    const form = document.createElement('div');
    form.innerHTML = `
        <h3>This test requires the following values:</h3>
        <form id="variable-form">
            ${test["Test Variables"].map(variable => `
                <label for="${variable}">${variable}</label>
                <input type="text" name="${variable}" id="${variable}" required>
                <br />
            `).join('')}
            <button type="submit">Continue</button>
        </form>
    `;
    
    //Add the form to the content area
    content.innerHTML = '';
    content.appendChild(form);
    
    //Add event listener to the form, resolve the promise when submitted
    return new Promise((resolve) => {
        document.getElementById('variable-form').addEventListener('submit', (e) => {
            e.preventDefault();
            //Collect the form data and store it in the testVariables map
            const formData = new FormData(e.target);
            testVariables.clear();
            for (const pair of formData.entries()) {
                testVariables.set(pair[0], pair[1]);
            }
            resolve();
        });
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
    return text.replace(/{{(\w+)}}/g, (match, variable) => {
        if (testVariables && testVariables.size > 0) {
            return testVariables.get(variable) || match;
        }
        return match;
    });
}

