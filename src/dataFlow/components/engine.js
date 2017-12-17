/*
 This file is the glue that connects Orchestra the visual flow programming Interface (and data "flow" handling)
 to its purpose: a CAD Kernel, iPython notebook, or other 'core' technology.

 Fundamentally, an 'engine' exposes a function `sendCalculation()` to the components, so they can communicate
 with whatever does calculation. `sendCalculation()` should be overridden per-project. For iPython, it sends
 an ajax call with a line of python.

 sendCalculation accepts three parameters:
   - code: sent to iPython for execution
   - success: callback invoked with 'output' of the executed python
   - error: callback invoked with an error object

Here's the rub: success() doesn't actually contain any data, because JavaScript is a step removed from the data.
Instead, success() is really just a status indicator. However in some cases, where 'output' is actually important
such as graphs, the contents of the output might be displayed via a "display output" component, which is really just
a box for some HTML output provided by Jupyter.

But the real issue is this: because JavaScript is not expected to know anything about the data, what it manages instead
are *variable names*. Say I have three components:

Number: (value set to 5)
Number: (value set to 10)
Addition: (inputs set to number components above)

In python, this would become:
x=5
y=10
z=x+y

Digging deeper, the number component should execute a line of python:

<uniq variable name> = {{ A }} + {{ B }}

where A & B get substituted on the fly with the names of the input variables.

Ie, the "output" on a component is actually just an array of unique variable names, which can be subbed in
to lines of python during calc-time.

So in the case above, the "addition" component may have an "output" of 15, but it's "output" so far as Orchestra is
concerned is just "z". To _display the value of z_ requires us to have a "display" component, which would simply run python:

print( {{ INPUT VARIABLE }} )

and display the output HTML in the component.

=================

Here's a mind-screw: we will have javascript arrays full of variables referencing python numpy arrays.

=================

This file is just a quick means of importing the python execution function, and getting consistent JS return objects.
For reference, here's the Jupyter API:

     // var callbacks = {
     //     clear_on_done: false,
     //     shell : {
     //         reply : function(r){console.log('reply',r)},
     //         payload : {
     //             set_next_input : function(r){console.log('set_next_input',r)},
     //             page : function(r){console.log('open_with_pager',r)}
     //         }
     //     },
     //     iopub : {
     //         output : function(){console.log('output',arguments)},
     //         clear_output : function(){console.log('clear output',arguments)},
     //     },
     //     input : function(r){console.log('input',r)}
     // }
     //
     // Jupyter.notebook.kernel.execute("x+=5\nprint(x)", callbacks, {silent: false, store_history: true,
     //     stop_on_error : false});

Orchestra is less interested in the details around messaging. Mostly, we want either a "done" reply (with status)
or some output to display... not both.

 */



define([], function(){
    function PythonEngine(){
        this.setupComplete = false;
        this.Jupyter = null;
        this.executionQueue = [];

        // A running record of python commands during the session.
        // this is meant to be retrieved by the main application so that
        // Orchestra's python can be 'dumped' into its cell as actual runnable code
        this.transcript = "";

        var that = this;

        var importStatements =
            "import numpy as np\n"+
            "import pandas as pd\n"+
            "import matplotlib as mpl\n"+
            "import matplotlib.pyplot as plt\n"+
            "%matplotlib inline\n";

        this.resetTranscript = function(){
            that.transcript = importStatements;
        };

        this.getTranscript = function () {
            // This is a tiny white lie.
            // In general, we just return that.transcript
            // However, the Kernel gateway API requires the API annotation comment
            // to be the first line of the cell. So, if there's an API component in the mix,
            // we'll use a regex here to find that line, and copy it to the very topmost line
            var re = /# (GET|POST|DELETE|PUT) \/.*\n/g;
            var found = that.transcript.match(re);
            if (found) {
                that.transcript = found[0] + that.transcript;
            }
            return that.transcript;
        };

        this.setup = function(J) {
            that.Jupyter = J;

            // "Setup" basically means store a reference to Jupyter, and run some basic imports that the components will need

            that.execute(importStatements, {
                success: function () {
                    console.log("Python Engine Successfully Initialized");

                    that.setupComplete = true;
                    if (that.executionQueue.length > 0) {
                         that._executeNext();
                    }
                },
                error: function (e) {
                    console.error("ERROR IMPORTING REQUIRED PYTHON LIBRARIES.");
                    throw new Error(e);
                }
            }, {
                force: true // to prevent the setup itself from being deferred
            });


        };

        this._executeNext = function(){
            console.warn('EXECUTE NEXT IS PROBABLY BROKEN. IT HAS NOT BEEN TESTED YET');
            // do the next execution in the queue
            var next = that.executionQueue.shift();
            that.execute.apply(this,next);

            // TODO: PROXY THE CALLBACKS, AND EXECUTE THE NEXT CALCULATION IN THE QUEUE
        };

        this.execute = function(pythonCode, callbacks, options){
            var statusSet = callbacks.statusSet || function(){}, // WAITING, RUNNING, DONE, ERROR
                success = callbacks.success  || function(){},
                error = callbacks.error || function(){},
                setOutput = callbacks.setOutput || function(){},
                force = options && options.force === true;
            // Build Jupyter-style callbacks, see above.
            // Everything we need is in the 'reply' and 'output' callbacks
            //
            // REPLY always comes back. OUTPUT doesn't.
            // This is the key to status indication:
            // reply.content.status = "error" or "ok"
            //
            // In error case:
            // reply.content.ename = "NameError"
            // reply.content.evalue = "name 'tttt' is not defined"
            // reply.content.traceback = array showing traceback... not sure if this is useful to the end user or not

            // In success case, when there's output:
            // output.content = {name: "stdout", text: "hello"} #(when printing "hello")
            // output.msg_type = "stream"

            if (that.setupComplete || force === true) {
                // execute the calculation. Might be nice to put some status in here, as some operations could run long
                statusSet("RUNNING");

                console.log("Executing Python: ", pythonCode);
                that.transcript += pythonCode;

                Jupyter.notebook.kernel.execute(pythonCode,
                    {
                        shell : {
                            reply : function(reply){
                                if (reply.content.status === "ok") {
                                    statusSet("DONE");
                                    success(reply.content);
                                } else if (reply.content.status === "error") {
                                    statusSet("ERROR");
                                    error(reply.content);
                                }
                            }
                        },
                        iopub : {
                            output : function(output){
                                setOutput(output.content);
                            }
                        }
                    },
                    {
                        silent: false,
                        store_history: false,
                        stop_on_error : false
                    }
                );
            } else {
                that.executionQueue.push(arguments);
            }
        }
    }

    return new PythonEngine();
});