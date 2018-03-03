#!/bin/bash

# https://stackoverflow.com/questions/1891797/capturing-groups-from-a-grep-regex

OUTPUT="$(jupyter notebook list | grep token)"

# extract the token from the human-readable response from jupyter
regex=".*token=([0-9a-zA-Z]*) "

if [[ $OUTPUT =~ $regex ]]
then
    tokenVal="${BASH_REMATCH[1]}"
    echo "${tokenVal}"
else
    echo "NO MATCH"
fi

# TODO: Get this curl working! Currently I'm getting 403s and such. But it's close... should be able to return the headers only, which would include the set-cookie header
#curl 'http://localhost:8888/login?next=%2F'  -H 'content-type: application/x-www-form-urlencoded' -H 'accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8' -H 'cache-control: no-cache' -H 'authority: mad-bell.orchestradatascience.com'  --data 'password=0f9b89191446bed1fc0fdd1238acfa9681785b7f0ce8f9cf' --compressed