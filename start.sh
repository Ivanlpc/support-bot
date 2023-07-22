#!/bin/sh
while true
do
node ./build/index
echo "Si quieres apagar el bot, CTRL + C"
echo "Reiniciando en:"
for i in 5 4 3 2 1
do
echo "$i..."
sleep 2
done
echo "Reiniciando"
done
