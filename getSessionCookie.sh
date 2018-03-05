#!/bin/bash

# https://stackoverflow.com/questions/1891797/capturing-groups-from-a-grep-regex

OUTPUT="$(jupyter notebook list | grep token)"

# extract the token from the human-readable response from jupyter
regex=".*token=([0-9a-zA-Z]*) "

if [[ $OUTPUT =~ $regex ]]
then
    tokenVal="${BASH_REMATCH[1]}"
    echo "TOKEN: ${tokenVal}"
else
    echo "NO MATCH"
fi

# TODO: Get this curl working! Currently I'm getting 403s and such. But it's close... should be able to return the headers only, which would include the set-cookie header
# need to set /etc/hosts such that a curl to <name>.orchestradatascience.com resolves to the jupyter notebook

# THIS CURL WORKS, BUT I NEED TO MAKE IT WITH THE RIGHT HOST HEADER SO THAT LOGIN DOESN"T ATTACH TO LOCALHOST, WHICH IS USELESS PUBLICLY
# curl 'http://localhost:8888/login?next=%2Ftree%3F'   -H 'content-type: application/x-www-form-urlencoded'  --data 'password=c5bd837f526c0638c7a1096104d11c843bb636da0338e0f1' -is | grep 'Set-Cookie'

#export ORCHESTRA_SUBDOMAIN

cmd="curl 'http://${ORCHESTRA_SUBDOMAIN}.orchestradatascience.com/login?next=%2Ftree%3F'   -H 'content-type: application/x-www-form-urlencoded'  --data 'password=${tokenVal}' -is | grep 'Set-Cookie'"

echo "CMD: ${cmd}"

eval $cmd

# Response = Set-Cookie: username-localhost-8888="2|1:0|10:1520110258|23:username-localhost-8888|44:Y2Q3YTFjMzIxZTI5NGE0ZjhiZTU0ZTIxOWE2OWY3ZWI=|fd3dc9b5b34a53fb56fb2422daaa3db390fe8ef2a8a6ff8e3467605a210dcf80"; expires=Mon, 02 Apr 2018 20:50:58 GMT; HttpOnly; Path=/

# username-localhost-8888="2|1:0|10:1520110258|23:username-localhost-8888|44:Y2Q3YTFjMzIxZTI5NGE0ZjhiZTU0ZTIxOWE2OWY3ZWI=|fd3dc9b5b34a53fb56fb2422daaa3db390fe8ef2a8a6ff8e3467605a210dcf80"; expires=Mon, 02 Apr 2018 20:50:58 GMT; HttpOnly; Path=/
# username-naughty-clarke-orchestradatascience-com="2|1:0|10:1520110018|48:username-naughty-clarke-orchestradatascience-com|44:MDQxM2IyNWExMmZiNDY0OTg3NzlmMTEzMTU1Y2I3MDM=|dac439c32a735d8274a7226f5d1cd27e6a8c5d6edb93661797b932059d88a156"; expires=Mon, 02 Apr 2018 20:46:58 GMT; HttpOnly; Path=/

#document.cookie='username-localhost-8888="2|1:0|10:1520110258|23:username-localhost-8888|44:Y2Q3YTFjMzIxZTI5NGE0ZjhiZTU0ZTIxOWE2OWY3ZWI=|fd3dc9b5b34a53fb56fb2422daaa3db390fe8ef2a8a6ff8e3467605a210dcf80"; expires=Mon, 02 Apr 2018 20:50:58 GMT; Path=/'

# TODO: changes --
#- the cookie response needs to have 'username-localhost' subbed out appropriately
#- I need to make the curl more minimal
#- XSRF still?
#- Remove "HttpOnly" from the cookie spec