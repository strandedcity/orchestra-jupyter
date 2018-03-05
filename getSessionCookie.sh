#!/bin/bash

# https://stackoverflow.com/questions/1891797/capturing-groups-from-a-grep-regex

OUTPUT="$(jupyter notebook list | grep token)"

# extract the token from the human-readable response from jupyter
regex=".*token=([0-9a-zA-Z]*) "

if [[ $OUTPUT =~ $regex ]]
then
    tokenVal="${BASH_REMATCH[1]}"
    # echo "TOKEN: ${tokenVal}" #debug
else
    # echo "NO MATCH"
fi

cmd="curl 'http://${ORCHESTRA_SUBDOMAIN}.orchestradatascience.com/login?next=%2Ftree%3F'   -H 'content-type: application/x-www-form-urlencoded'  --data 'password=${tokenVal}' -is | grep 'Set-Cookie' | sed -e \"s/^Set-Cookie: //\" | sed -e \"s/HttpOnly; //\" "

# echo "CMD: ${cmd}" #debug

eval $cmd

# Response like:
# Set-Cookie: username-localhost-8888="2|1:0|10:1520110258|23:username-localhost-8888|44:Y2Q3YTFjMzIxZTI5NGE0ZjhiZTU0ZTIxOWE2OWY3ZWI=|fd3dc9b5b34a53fb56fb2422daaa3db390fe8ef2a8a6ff8e3467605a210dcf80"; expires=Mon, 02 Apr 2018 20:50:58 GMT; HttpOnly; Path=/

# Will become only what I need:
# username-kickass-curran-orchestradatascience-com="2|1:0|10:1520228006|48:username-kickass-curran-orchestradatascience-com|44:ZDdiZjNkZWQyZGVjNDVkZGFmZTE4MWY2YTg1ZTFkYTA=|da418f197e7134a4c2d655fd4723d3df869c761f4cf93bbecf8eba54cd1bc0e3"; expires=Wed, 04 Apr 2018 05:33:26 GMT; Path=/

# Note the token is never passed to the frontend!