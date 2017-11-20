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

        var that = this;
        this.setup = function(J) {
            that.Jupyter = J;
            that.setupComplete = true;
            if (that.executionQueue.length > 0) {
                that._executeNext();
            }
        };

        this._executeNext = function(){
            // do the next execution in the queue
            var next = that.executionQueue.shift();
            that.execute(next);

            // TODO: PROXY THE CALLBACKS, AND EXECUTE THE NEXT CALCULATION IN THE QUEUE
        };

        this.execute = function(calculation){
            var pythonCode = calculation.pythonCode,
                statusSet = calculation.statusSet, // WAITING, RUNNING, DONE, ERROR
                success = calculation.success,
                error = calculation.error,
                setOutput = calculation.setOutput || function(){};
console.log('now inside python engine execute')
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

console.log('setup complete?',that.setupComplete);
            if (that.setupComplete) {
                // execute the calculation. Might be nice to put some status in here, as some operations could run long
                statusSet("RUNNING");
                Jupyter.notebook.kernel.execute(pythonCode,
                    {
                        shell : {
                            reply : function(reply){
                                if (reply.content.status === "ok") {
                                    statusSet("DONE");
                                    success();
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
                that.executionQueue.push(calculation);
            }
        }
    }

    var engineInstance = new PythonEngine();

    // TODO: THIS MUST GO !
    // I'm having trouble working out how to get Require to pass Jupyter into this file,
    // so this is a hack to see if the rest of my stuff is working. It should be fixed.
    engineInstance.setup(window.Jupyter);

    return engineInstance;
});