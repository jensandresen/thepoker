import os

stream = os.popen('git log --pretty=format:%H -1')
output = stream.read()

print('sha is: ' + output)
