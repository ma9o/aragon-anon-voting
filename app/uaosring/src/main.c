#include <stdlib.h>
#include <stdio.h>

#include <emscripten.h>
#include <Python.h>

PyObject* module;

// Using strings instead of doubles because JS can't handle numbers larger than 2^53

char* sign(char* m, char* p, char* s, char* f, char** k, int numKeys){

    PyObject* function = PyObject_GetAttrString(module, "sign");

    PyObject* msg = PyUnicode_FromString(m);
    PyObject* pub = PyUnicode_FromString(p);
    PyObject* sec = PyUnicode_FromString(s);
    PyObject* fake = PyUnicode_FromString(f);
    PyObject* keys = PyList_New(numKeys);

    for (int i = 0; i < numKeys * 2; i = i + 2) {
        PyObject* k1 = PyUnicode_FromString(k[i]);
        PyObject* k2 = PyUnicode_FromString(k[i+1]);
        PyList_SET_ITEM(keys, i/2, PyTuple_Pack(2, k1, k2));
    }

    PyObject* result = PyObject_CallFunctionObjArgs(function, msg, pub, sec, fake, keys, NULL);
    return PyUnicode_AsUTF8(PyObject_Str(result));
}

char* genID() {
    PyObject* function = PyObject_GetAttrString(module, "genID");
    PyObject* result = PyObject_CallFunction(function, NULL);
    return PyUnicode_AsUTF8(PyObject_Str(result));
}

static void onload(const char *filename) {
    printf("Loaded %s.\n", filename);
    PyRun_SimpleString("import sys ; sys.path.insert(0, '/app.zip')");
    module = PyImport_ImportModule("app.id");
}


static void onloaderror(const char *filename) {
    printf("Failed to load %s, aborting.\n", filename);
    PyRun_SimpleString("print('fail')");
}

int main(int argc, char** argv) {
    setenv("PYTHONHOME", "/", 0);

    Py_InitializeEx(0);
    emscripten_async_wget("app.zip", "/app.zip", onload, onloaderror);

    emscripten_exit_with_live_runtime();
    return 0;
}


