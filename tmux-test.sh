#!/bin/bash
# Way to test streaming with multiple session in tmux

if [ -z "$1" ]; then
  echo "Please provide the number of windows as a parameter."
  exit 1
fi

# Number of windows to create
NUM_WINDOWS=$1

# Create a new tmux session in detached mode
tmux new-session -d -s my_session

# Create panes and run the curl command in each
for i in $(seq 1 $NUM_WINDOWS); do
  tmux split-window -t my_session "curl <add stream url here>"
  tmux select-layout -t my_session tiled > /dev/null 2>&1
done

# Attach to the tmux session
tmux attach -t my_session