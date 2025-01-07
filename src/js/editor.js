const MESSAGES = {
    ERR_EMPTY : "Please enter a value",
    ERR_INVALID: "Invalid JSON"
}
document.getElementById('create-new').addEventListener('click', () => {
    document.getElementById('editor-landing').classList.add('hidden');
    document.getElementById('editor-form').classList.remove('hidden');
    clearForm();
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
        alert('Please select a file to load');
    }
});

document.getElementById('save-procedure').addEventListener('click', () => {
    const jsonContent = document.getElementById('json-content').value;
    if (!jsonContent) {
        const errorMessage = document.getElementById('json-error');
        errorMessage.innerText = MESSAGES.ERR_EMPTY;
        errorMessage.classList.remove('hidden');
        document.getElementById('json-content').classList.add('error');
        return;
    }
    storeProcedure(jsonContent);
});

document.getElementById('back-to-landing').addEventListener('click', () => {
    document.getElementById('editor-landing').classList.remove('hidden');
    document.getElementById('editor-form').classList.add('hidden');
    clearForm();
});

function loadProcedure(procedure) {
    document.getElementById('editor-landing').classList.add('hidden');
    document.getElementById('editor-form').classList.remove('hidden');

    document.getElementById('procedure-name').value = procedure["Test Procedure"];
    document.getElementById('procedure-updated').value = procedure.Updated;
    document.getElementById('procedure-author').value = procedure.Author;
    document.getElementById('procedure-description').value = procedure.Description;
    document.getElementById('json-content').value = JSON.stringify(procedure.Tests, null, 2);
}

function clearForm() {
    document.getElementById('metadata-form').reset();
    document.getElementById('json-content').value = '';
    document.getElementById('json-error').classList.add('hidden');
    document.getElementById('json-error').value = '';
    document.getElementById('json-content').classList.remove('error');
}

function storeProcedure(jsonContent) {
    if (!isValidJSON(jsonContent)){
        const errorMessage = document.getElementById('json-error');
        errorMessage.innerText = MESSAGES.ERR_INVALID;
        errorMessage.classList.remove('hidden');
        document.getElementById('json-content').classList.add('error');
        return;
    }
    const procedure = {
        "Test Procedure": document.getElementById('procedure-name').value,
        "Updated": document.getElementById('procedure-updated').value,
        "Author": document.getElementById('procedure-author').value,
        "Description": document.getElementById('procedure-description').value,
        "Tests": JSON.parse(jsonContent)
    };
    const blob = new Blob([JSON.stringify(procedure, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${procedure["Test Procedure"]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function isValidJSON(jsonContent) {
    try {
        JSON.parse(jsonContent);
        return true;
    } catch (error) {
        return false;
    }
}