#!/bin/bash

# This file is to let us easily add packages to the docker container instead of installing locally.
# this allows us to install via IE:
# yarn addDc -D package-name

# check if there are no parameters
if [ -z "$1" ]
  then
    echo "No argument supplied"
    exit 1
fi

# initialize variables
declare -a params
isDev=false

# loop through all parameters
for var in "$@"
do
  # if parameter is -D, set isDev to true
  if [ "$var" == "-D" ]
    then
      isDev=true
    else
      # if parameter is not -D, add it to the params array
      params+=("$var")
  fi
done

# check if there is a package name
if [ ${#params[@]} -eq 0 ]
  then
    echo "No package name supplied"
    exit 1
fi

# if isDev is true, pass -D and the package name to the yarn add command
if $isDev
  then
    docker-compose exec node yarn add -D "${params[@]}" --prefix ../
  else
    # if isDev is false, pass the package name to the yarn add command
    docker-compose exec node yarn add "${params[@]}" --prefix ../
fi
